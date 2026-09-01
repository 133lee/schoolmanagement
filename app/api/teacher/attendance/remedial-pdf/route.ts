import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { withAuth } from "@/lib/http/with-auth";
import { handleApiError } from "@/lib/http/error-handler";
import { ValidationError } from "@/lib/http/errors";
import { lessonLogService } from "@/features/lesson-logs/lessonLog.service";
import { slotDateQuerySchema } from "@/features/lesson-logs/lessonLog.validation";
import { timetableSlotRepository } from "@/features/timetables/timetableSlot.repository";
import { RemedialListPDF } from "@/lib/pdf/remedial-list-pdf";
import { getSchoolInfo, getSchoolLogoBase64 } from "@/lib/settings/school-info-helper";
import { pdfLimiter } from "@/lib/pdf/pdf-limiter";
import { formatCompactClassLabel } from "@/lib/utils";
import { Role } from "@/types/prisma-enums";

/**
 * GET /api/teacher/attendance/remedial-pdf?timetableSlotId=&date=
 * Downloadable remedial list for a single period: the topic missed and the
 * students who were absent for it.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context = { userId: user.userId, role: user.role as Role };
    const { searchParams } = new URL(request.url);

    const parsed = slotDateQuerySchema.safeParse({
      timetableSlotId: searchParams.get("timetableSlotId"),
      date: searchParams.get("date"),
    });
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", parsed.error.flatten().fieldErrors);
    }
    const { timetableSlotId, date } = parsed.data;

    const [{ log, absentees }, slot, schoolInfo, logoBase64] = await Promise.all([
      lessonLogService.getRemedialViewForExport(timetableSlotId, date, context),
      timetableSlotRepository.findByIdWithRelations(timetableSlotId),
      getSchoolInfo(),
      getSchoolLogoBase64(),
    ]);

    if (!slot) {
      throw new ValidationError("Timetable slot not found");
    }

    const pdfComponent = React.createElement(RemedialListPDF, {
      className: formatCompactClassLabel(slot.class.grade.name, slot.class.name),
      subjectName: slot.subject.name,
      date: date.toLocaleDateString("en-GB"),
      periodNumber: slot.periodNumber,
      topic: log.topic,
      subtopics: log.subtopics,
      students: absentees.map((a) => ({ studentNumber: a.studentNumber, name: a.name })),
      generatedDate: new Date().toLocaleDateString("en-GB"),
      schoolName: schoolInfo.name,
      logoUrl: logoBase64 || undefined,
    });

    const pdfBuffer = await pdfLimiter.run(async () => {
      const stream = await renderToStream(pdfComponent as any);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    });

    if (pdfBuffer.length === 0) {
      return NextResponse.json({ success: false, error: "Failed to generate PDF" }, { status: 500 });
    }

    const safeClass = slot.class.name.replace(/[^a-zA-Z0-9]/g, "_");
    const safeDate = date.toISOString().split("T")[0];
    const filename = `RemedialList_${safeClass}_${safeDate}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "GET /api/teacher/attendance/remedial-pdf",
    });
  }
});
