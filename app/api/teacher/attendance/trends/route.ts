import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherAttendanceService } from "@/features/teachers/teacher-attendance.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/teacher/attendance/trends
 *
 * Get attendance trends for a class over a time period.
 * Data is grouped by date with separate counts for boys and girls.
 *
 * Query params:
 * - classId: The class ID (required)
 * - timeRange: Time range for trends ("7d", "30d", "90d") - default: "30d"
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const timeRange = (searchParams.get("timeRange") || "30d") as "7d" | "30d" | "90d";

    if (!classId) {
      return ApiResponse.badRequest("classId is required");
    }

    logger.logRequest("GET", "/api/teacher/attendance/trends", user.userId, {
      classId,
      timeRange,
    });

    const trends = await teacherAttendanceService.getAttendanceTrends(
      user.userId,
      classId,
      timeRange
    );

    return ApiResponse.success(trends);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/teacher/attendance/trends",
    });
  }
});
