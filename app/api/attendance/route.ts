import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { attendanceRecordService } from "@/features/attendance/attendanceRecord.service";
import { AttendanceStatus, Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/attendance
 * List attendance records with filters and pagination
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("studentId") || undefined;
    const classId = searchParams.get("classId") || undefined;
    const termId = searchParams.get("termId") || undefined;
    const status = (searchParams.get("status") as AttendanceStatus) || undefined;
    const dateFrom = searchParams.get("dateFrom")
      ? new Date(searchParams.get("dateFrom")!)
      : undefined;
    const dateTo = searchParams.get("dateTo")
      ? new Date(searchParams.get("dateTo")!)
      : undefined;
    // "daily" -> null (daily register only); a real ID -> that slot; omitted -> all
    const timetableSlotIdParam = searchParams.get("timetableSlotId");
    const timetableSlotId =
      timetableSlotIdParam === "daily" ? null : timetableSlotIdParam ?? undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    const result = await attendanceRecordService.listAttendance(
      { studentId, classId, termId, status, dateFrom, dateTo, timetableSlotId },
      { page, pageSize },
      context
    );

    return ApiResponse.success(result.data, result.pagination);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/attendance" });
  }
});

/**
 * POST /api/attendance
 * Mark attendance (single or bulk)
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();

    // Bulk attendance
    if (body.records && Array.isArray(body.records)) {
      const { classId, termId, date, records, timetableSlotId } = body;

      if (!classId || !termId || !date || !records) {
        return ApiResponse.badRequest("Missing required fields for bulk attendance");
      }

      const result = await attendanceRecordService.bulkMarkAttendance(
        {
          classId,
          termId,
          date: new Date(date),
          records,
          timetableSlotId: timetableSlotId ?? null,
        },
        context
      );

      // If every record failed, surface the first error so the UI can show it
      if (result.successful === 0 && result.failed.length > 0) {
        return ApiResponse.badRequest(result.failed[0].error);
      }

      return ApiResponse.created(result);
    }

    // Single attendance
    const { studentId, classId, termId, date, status, remarks, timetableSlotId } = body;

    if (!studentId || !classId || !termId || !date || !status) {
      return ApiResponse.badRequest("Missing required fields");
    }

    const record = await attendanceRecordService.markAttendance(
      {
        studentId,
        classId,
        termId,
        date: new Date(date),
        status,
        remarks,
        timetableSlotId: timetableSlotId ?? null,
      },
      context
    );

    return ApiResponse.created(record);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/attendance" });
  }
});
