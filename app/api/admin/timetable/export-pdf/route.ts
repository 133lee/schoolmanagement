import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import React from "react";
import JSZip from "jszip";
import { withAuth } from "@/lib/http/with-auth";
import { handleApiError } from "@/lib/http/error-handler";
import { TimetablePDF } from "@/lib/pdf/timetable-pdf";
import { timetableService } from "@/features/timetables/timetable.service";
import { logger } from "@/lib/logger/logger";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";
import { pdfLimiter } from "@/lib/pdf/pdf-limiter";

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Hands control back to the event loop for a tick so other pending requests
// get a chance to run between renders — otherwise a single exportAll request
// (one renderToStream call per class, all in one request) can monopolize the
// event loop for the entire loop's duration before anyone else gets served.
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * GET /api/admin/timetable/export-pdf
 * Export timetable as PDF (single class/teacher) or ZIP (all classes)
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const teacherId = searchParams.get("teacherId");
    const exportAll = searchParams.get("exportAll") === "true";

    const { periodSlots } = await timetableService.getExportContext(context);

    // CASE 1: Export all classes as ZIP
    if (exportAll) {
      const allClasses = await timetableService.getActiveClassesForExport();

      if (allClasses.length === 0) {
        return NextResponse.json({ error: "No active classes found" }, { status: 404 });
      }

      const zip = new JSZip();

      for (const classItem of allClasses) {
        try {
          const result = await timetableService.getAllTimetables(context, {
            classId: classItem.id,
          });

          if (!result.slots || result.slots.length === 0) {
            continue;
          }

          const pdfComponent = React.createElement(TimetablePDF, {
            className: `${classItem.grade.name} ${classItem.name}`,
            slots: result.slots as any,
            periodSlots,
            generatedDate: new Date().toLocaleDateString("en-GB"),
          });

          const buffer = await pdfLimiter.run(async () => {
            const stream = await renderToStream(pdfComponent as any);
            return streamToBuffer(stream);
          });

          if (buffer.length > 0) {
            zip.file(`${classItem.grade.name}_${classItem.name}.pdf`, buffer);
          }
        } catch (error) {
          logger.error(
            `Failed to generate PDF for ${classItem.grade.name} ${classItem.name}`,
            error instanceof Error ? error : undefined
          );
        } finally {
          // Let other pending requests get a turn before rendering the next
          // class's PDF — otherwise this single request blocks everyone else
          // for its entire duration.
          await yieldToEventLoop();
        }
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      const timestamp = Date.now();

      return new NextResponse(zipBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Length": zipBuffer.length.toString(),
          "Content-Disposition": `attachment; filename="all_timetables_${timestamp}.zip"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // CASE 2: Export single class timetable
    if (classId) {
      const classData = await timetableService.getClassForExport(classId);
      const result = await timetableService.getAllTimetables(context, { classId });

      if (!result.slots || result.slots.length === 0) {
        return NextResponse.json(
          { error: "No timetable slots found for export. Generate a timetable first." },
          { status: 400 }
        );
      }

      const pdfComponent = React.createElement(TimetablePDF, {
        className: `${classData.grade.name} ${classData.name}`,
        slots: result.slots as any,
        periodSlots,
        generatedDate: new Date().toLocaleDateString("en-GB"),
      });

      const pdfBuffer = await pdfLimiter.run(async () => {
        const stream = await renderToStream(pdfComponent as any);
        return streamToBuffer(stream);
      });

      if (pdfBuffer.length === 0) {
        return NextResponse.json(
          { error: "Failed to render PDF: empty output" },
          { status: 500 }
        );
      }

      const timestamp = Date.now();
      const safeClassName = `${classData.grade.name}_${classData.name}`.replace(/[^a-zA-Z0-9_-]/g, "_");

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": pdfBuffer.length.toString(),
          "Content-Disposition": `attachment; filename="timetable_${safeClassName}_${timestamp}.pdf"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // CASE 3: Export teacher timetable
    if (teacherId) {
      const teacher = await timetableService.getTeacherForExport(teacherId);
      const result = await timetableService.getAllTimetables(context, { teacherId });

      if (!result.slots || result.slots.length === 0) {
        return NextResponse.json(
          { error: "No timetable slots found for this teacher. Generate a timetable first." },
          { status: 400 }
        );
      }

      const pdfComponent = React.createElement(TimetablePDF, {
        className: `${teacher.firstName} ${teacher.lastName} - Teacher Timetable`,
        slots: result.slots as any,
        periodSlots,
        generatedDate: new Date().toLocaleDateString("en-GB"),
      });

      const pdfBuffer = await pdfLimiter.run(async () => {
        const stream = await renderToStream(pdfComponent as any);
        return streamToBuffer(stream);
      });

      if (pdfBuffer.length === 0) {
        return NextResponse.json(
          { error: "Failed to render PDF: empty output" },
          { status: 500 }
        );
      }

      const timestamp = Date.now();
      const safeTeacherName = `${teacher.lastName}_${teacher.firstName}`.replace(/[^a-zA-Z0-9_-]/g, "_");

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Length": pdfBuffer.length.toString(),
          "Content-Disposition": `attachment; filename="timetable_teacher_${safeTeacherName}_${timestamp}.pdf"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    return NextResponse.json(
      { error: "Please provide classId, teacherId, or set exportAll=true" },
      { status: 400 }
    );
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "GET /api/admin/timetable/export-pdf",
    });
  }
});
