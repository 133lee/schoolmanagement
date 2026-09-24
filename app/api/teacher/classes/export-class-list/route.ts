import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import { asPdfDocument } from "@/lib/pdf/as-pdf-document";
import { withAuth } from "@/lib/http/with-auth";
import { handleApiError } from "@/lib/http/error-handler";
import { ApiResponse } from "@/lib/http/api-response";
import { teacherClassService } from "@/features/teachers/teacher-class.service";
import { ClassListPDF } from "@/lib/pdf/class-list-pdf";
import { generateClassListCsv } from "@/lib/csv/class-list-csv";
import { getSchoolInfo, getSchoolLogoBase64 } from "@/lib/settings/school-info-helper";
import { pdfLimiter } from "@/lib/pdf/pdf-limiter";

/**
 * GET /api/teacher/classes/export-class-list?classId=xxx&mode=class|subject&format=pdf|csv
 * Export class list (students) as a PDF (default) or CSV file.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const mode = searchParams.get("mode") as "class" | "subject" | null;
    const subjectId = searchParams.get("subjectId") || undefined;
    const format = (searchParams.get("format") || "pdf") as "pdf" | "csv";

    if (!classId) {
      return ApiResponse.badRequest("classId parameter is required");
    }
    if (!mode || !["class", "subject"].includes(mode)) {
      return ApiResponse.badRequest("mode parameter must be 'class' or 'subject'");
    }
    if (!["pdf", "csv"].includes(format)) {
      return ApiResponse.badRequest("format parameter must be 'pdf' or 'csv'");
    }

    const exportData = await teacherClassService.getClassListForExport(user.userId, classId, mode, subjectId);
    const { className, academicYear, subjectName, students } = exportData;

    const safeModeText = mode === "class" ? "ClassTeacher" : "SubjectTeacher";
    const safeClassName = className.replace(/[^a-zA-Z0-9]/g, "_");
    const safeSubject = subjectName ? "_" + subjectName.replace(/[^a-zA-Z0-9]/g, "_") : "";
    const baseFilename = `ClassList_${safeClassName}${safeSubject}_${safeModeText}_${new Date().toISOString().split("T")[0]}`;

    if (format === "csv") {
      const csv = generateClassListCsv(exportData);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseFilename}.csv"`,
        },
      });
    }

    const schoolInfo = await getSchoolInfo();
    const logoBase64 = await getSchoolLogoBase64();

    const title = `Class List - ${className}`;

    const pdfComponent = React.createElement(ClassListPDF, {
      title,
      className,
      academicYear,
      subjectName,
      students,
      generatedDate: new Date().toLocaleDateString("en-GB"),
      schoolName: schoolInfo.name,
      logoUrl: logoBase64 || undefined,
    });

    const pdfBuffer = await pdfLimiter.run(async () => {
      const stream = await renderToStream(asPdfDocument(pdfComponent));
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    });

    if (pdfBuffer.length === 0) {
      return ApiResponse.internalError("Failed to generate PDF");
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseFilename}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "GET /api/teacher/classes/export-class-list",
    });
  }
});
