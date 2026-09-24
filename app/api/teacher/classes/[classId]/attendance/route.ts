import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherAttendanceService } from "@/features/teachers/teacher-attendance.service";
import { logger } from "@/lib/logger/logger";
import { BadRequestError } from "@/lib/http/errors";

/**
 * GET /api/teacher/classes/[classId]/attendance
 *
 * Get attendance data for a class for a specific month.
 * Returns a grid with attendance status for each student for each day of the month.
 *
 * Query params:
 * - month: Month number (0-11, JavaScript Date convention) - defaults to current month
 * - year: Year (e.g., 2024) - defaults to current year
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  return withAuth(async (req, user) => {
    try {
      const { classId } = await params;

      // Get query parameters for month and year
      const searchParams = request.nextUrl.searchParams;
      const month = parseInt(
        searchParams.get("month") || String(new Date().getMonth())
      );
      const year = parseInt(
        searchParams.get("year") || String(new Date().getFullYear())
      );

      // Validate month and year
      if (isNaN(month) || month < 0 || month > 11) {
        throw new BadRequestError("Invalid month parameter (0-11)");
      }

      if (isNaN(year) || year < 2000 || year > 2100) {
        throw new BadRequestError("Invalid year parameter");
      }

      logger.logRequest(
        "GET",
        `/api/teacher/classes/${classId}/attendance`,
        user.userId,
        {
          classId,
          month,
          year,
        }
      );

      const attendanceData = await teacherAttendanceService.getClassAttendanceForMonth(
        user.userId,
        classId,
        month,
        year
      );

      return ApiResponse.success(attendanceData);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `/api/teacher/classes/[classId]/attendance`,
      });
    }
  })(request);
}
