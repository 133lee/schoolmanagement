import { NextRequest } from "next/server";
import { withRole } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { reportService } from "@/features/reports/report.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/admin/reports/performance
 *
 * Get student performance data including pass/fail lists and top improvers
 */
export const GET = withRole(["ADMIN", "HEAD_TEACHER"], async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/admin/reports/performance", user.userId);

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const termId = searchParams.get("termId");

    if (!classId || !termId) {
      return ApiResponse.error("Class ID and Term ID are required", 400);
    }

    const report = await reportService.getClassPerformanceReport(classId, termId);

    return ApiResponse.success(report);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/admin/reports/performance",
    });
  }
});
