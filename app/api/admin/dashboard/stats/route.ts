import { NextRequest } from "next/server";
import { withRole } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { adminDashboardService } from "@/features/dashboard/adminDashboard.service";
import { logger } from "@/lib/logger/logger";

export const GET = withRole(["ADMIN", "HEAD_TEACHER", "CLERK"], async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/admin/dashboard/stats", user.userId);

    const stats = await adminDashboardService.getOverviewStats();

    return ApiResponse.success(stats);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/admin/dashboard/stats",
    });
  }
});
