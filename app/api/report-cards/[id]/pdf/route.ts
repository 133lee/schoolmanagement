import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { withAuth } from '@/lib/http/with-auth';
import { handleApiError } from '@/lib/http/error-handler';
import { NotFoundError } from '@/lib/http/errors';
import { asPdfDocument } from '@/lib/pdf/as-pdf-document';
import { formatAttendanceLabel } from '@/lib/report-cards/attendance-label';
import { reportCardService } from '@/features/report-cards/reportCard.service';
import { Role } from '@/types/prisma-enums';
import { AuthContext } from '@/lib/auth/authorization';
import {
  SeniorReportCard,
  JuniorReportCard,
  getReportCardType,
} from '@/components/report-cards';
import { getSchoolInfo, getSchoolLogoBase64 } from '@/lib/settings/school-info-helper';
import { computeBestOfSixFromReportCard } from '@/lib/services/performance-calculator';
import { pdfLimiter } from '@/lib/pdf/pdf-limiter';
import { formatTeacherLabel, formatCompactClassLabel } from '@/lib/utils';
import React from 'react';

/**
 * GET /api/report-cards/[id]/pdf
 * Generate and download PDF for a specific report card
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const reportCard = await reportCardService.getReportCardWithRelations(id, context);

      if (!reportCard) {
        throw new NotFoundError('Report card not found');
      }

      const schoolInfo = await getSchoolInfo();
      const logoBase64 = await getSchoolLogoBase64();

      const gradeLevel = reportCard.class.grade?.level || '';
      const gradeName = reportCard.class.grade?.name || null;
      const subjectsForBestSix = reportCard.subjects.map((sub) => ({
        name: sub.subject.name,
        totalMark: sub.totalMark ?? null,
        grade: sub.grade ?? null,
      }));
      const bestOfSix = computeBestOfSixFromReportCard(
        subjectsForBestSix, gradeLevel, gradeName, reportCard.class.name
      );

      const pdfData = {
        pupilName: `${reportCard.student.firstName} ${reportCard.student.middleName || ''} ${reportCard.student.lastName}`.trim(),
        // Grade-prefixed for display ("12 A") — Form classes ("F1-B") keep
        // their own self-identifying name as-is.
        class: formatCompactClassLabel(gradeName, reportCard.class.name),
        classTeacher: formatTeacherLabel(reportCard.classTeacher),
        year: reportCard.academicYear.year.toString(),
        bestOfSix: bestOfSix || 'N/A',
        attendance: formatAttendanceLabel(reportCard),
        status: reportCard.promotionStatus || 'In Progress',
        subjects: reportCard.subjects.map((sub) => ({
          name: sub.subject.name,
          cat: sub.catAbsent ? 'AB' : sub.catMark ?? '-',
          mid: sub.midAbsent ? 'AB' : sub.midMark ?? '-',
          eot: sub.eotAbsent ? 'AB' : sub.eotMark ?? '-',
          comment: sub.remarks || '',
        })),
        teacherComment: reportCard.classTeacherRemarks || '',
        headTeacherComment: reportCard.headTeacherRemarks || '',
        schoolName: schoolInfo.name,
        logoUrl: logoBase64 || undefined,
      };

      const reportCardType = getReportCardType(reportCard.class.grade.level, gradeName, reportCard.class.name);

      const pdfComponent =
        reportCardType === 'JUNIOR'
          ? React.createElement(JuniorReportCard, { data: pdfData })
          : React.createElement(SeniorReportCard, { data: pdfData });

      // Generate PDF — rate-limited so concurrent requests queue rather than
      // saturating the CPU and blocking the entire Node.js event loop.
      const pdfBuffer = await pdfLimiter.run(async () => {
        const stream = await renderToStream(asPdfDocument(pdfComponent));
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk as unknown as Uint8Array);
        }
        return Buffer.concat(chunks);
      });

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ReportCard_${reportCard.student.studentNumber}_${reportCard.term.termType}.pdf"`,
        },
      });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/report-cards/${(await params).id}/pdf`,
      });
    }
  }
);
