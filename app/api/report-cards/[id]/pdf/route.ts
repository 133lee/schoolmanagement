import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { withAuth } from '@/lib/http/with-auth';
import { handleApiError } from '@/lib/http/error-handler';
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
        return NextResponse.json({ success: false, error: 'Report card not found' }, { status: 404 });
      }

      const schoolInfo = await getSchoolInfo();
      const logoBase64 = await getSchoolLogoBase64();

      const gradeId = (reportCard.class as any).grade?.id || '';
      const gradeLevel = (reportCard.class as any).grade?.level || '';
      const gradeName = (reportCard.class as any).grade?.name || null;
      const subjectsForBestSix = reportCard.subjects.map((sub) => {
        const gs = (sub.subject as any).gradeSubjects?.find((g: any) => g.gradeId === gradeId);
        return {
          totalMark: sub.totalMark ?? null,
          grade: sub.grade ?? null,
          isCore: gs?.isCore ?? true,
        };
      });
      const bestOfSix = computeBestOfSixFromReportCard(
        subjectsForBestSix, gradeLevel, gradeName, reportCard.class.name
      );

      const pdfData = {
        pupilName: `${reportCard.student.firstName} ${reportCard.student.middleName || ''} ${reportCard.student.lastName}`.trim(),
        class: reportCard.class.name,
        classTeacher: `${reportCard.classTeacher.firstName} ${reportCard.classTeacher.lastName}`,
        year: reportCard.academicYear.year.toString(),
        bestOfSix: bestOfSix || 'N/A',
        status: reportCard.promotionStatus || 'In Progress',
        subjects: reportCard.subjects.map((sub) => ({
          name: sub.subject.name,
          mid: sub.midMark ?? '-',
          eot: sub.eotMark ?? '-',
          comment: sub.remarks || '',
        })),
        teacherComment: reportCard.classTeacherRemarks || '',
        headTeacherComment: reportCard.headTeacherRemarks || '',
        schoolName: schoolInfo.name,
        logoUrl: logoBase64 || undefined,
      };

      const reportCardType = getReportCardType(reportCard.class.grade.level);

      let pdfComponent: any;
      const createPdfEl = React.createElement as any;
      switch (reportCardType) {
        case 'JUNIOR':
          pdfComponent = createPdfEl(JuniorReportCard, { data: pdfData });
          break;
        case 'SENIOR':
        default:
          pdfComponent = createPdfEl(SeniorReportCard, { data: pdfData });
          break;
      }

      // Generate PDF — rate-limited so concurrent requests queue rather than
      // saturating the CPU and blocking the entire Node.js event loop.
      const pdfBuffer = await pdfLimiter.run(async () => {
        const stream = await renderToStream(pdfComponent as any);
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
