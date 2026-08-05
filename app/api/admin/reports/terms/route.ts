import { NextRequest } from "next/server";
import { withRole } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { reportService } from "@/features/reports/report.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/admin/reports/terms
 *
 * Get all terms for admin reports filtering
 */
export const GET = withRole(["ADMIN", "HEAD_TEACHER"], async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/admin/reports/terms", user.userId);

    const terms = await reportService.getAdminTerms();

    return ApiResponse.success({ terms });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/admin/reports/terms",
    });
  }
});
