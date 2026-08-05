import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { adminAttendanceAnalyticsService } from "@/features/admin/admin-attendance-analytics.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/admin/attendance/analytics
 *
 * Get attendance trend analytics with male/female breakdown.
 * Supports grade-level aggregation and per-class filtering.
 *
 * Query params:
 * - startDate: Start date (ISO format) - required
 * - endDate: End date (ISO format) - required
 * - gradeId: Grade ID for filtering (optional)
 * - classId: Class ID for specific class (optional)
 * - includeClassBreakdown: Include per-class breakdown (true/false) - default: false
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      // Get query parameters
      const searchParams = request.nextUrl.searchParams;
      const startDateStr = searchParams.get("startDate");
      const endDateStr = searchParams.get("endDate");
      const gradeId = searchParams.get("gradeId") || undefined;
      const classId = searchParams.get("classId") || undefined;
      const includeClassBreakdown =
        searchParams.get("includeClassBreakdown") === "true";

      if (!startDateStr || !endDateStr) {
        return ApiResponse.error("Start date and end date are required", 400);
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return ApiResponse.error("Invalid date format", 400);
      }

      logger.logRequest("GET", "/api/admin/attendance/analytics", user.userId, {
        startDate: startDateStr,
        endDate: endDateStr,
        gradeId,
        classId,
        includeClassBreakdown,
      });

      // Check if user has admin permissions
      if (!["ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD"].includes(user.role)) {
        return ApiResponse.error("Unauthorized. Admin access required.", 403);
      }

      // Get attendance trend data
      const trendData =
        await adminAttendanceAnalyticsService.getAttendanceTrend(
          startDate,
          endDate,
          gradeId,
          classId
        );

      let classBreakdown = null;

      // Get per-class breakdown if requested and gradeId is provided
      if (includeClassBreakdown && gradeId) {
        classBreakdown =
          await adminAttendanceAnalyticsService.getPerClassAttendanceSummary(
            startDate,
            endDate,
            gradeId
          );
      }

      return ApiResponse.success({
        trend: trendData,
        classBreakdown,
      });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: "/api/admin/attendance/analytics",
      });
    }
  })(request, {} as any);
}
