import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { attendanceRecordService } from "@/features/attendance/attendanceRecord.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/attendance/period?timetableSlotId=...&date=YYYY-MM-DD
 *
 * Returns all student attendance records for a specific timetable slot on a
 * given date. Used by subject teachers to load or review their period register.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = request.nextUrl;
    const timetableSlotId = searchParams.get("timetableSlotId");
    const dateParam = searchParams.get("date");

    if (!timetableSlotId || !dateParam) {
      return ApiResponse.badRequest("timetableSlotId and date are required");
    }

    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return ApiResponse.badRequest("Invalid date format. Use YYYY-MM-DD.");
    }

    const records = await attendanceRecordService.getPeriodAttendanceForSlot(
      timetableSlotId,
      date,
      context
    );

    return ApiResponse.success(records);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/attendance/period" });
  }
});
