import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { logger } from "@/lib/logger/logger";
import { termService } from "@/features/terms/term.service";

/**
 * GET /api/teacher/reports/terms
 *
 * Fetch all available terms for report viewing.
 * Returns terms ordered by academic year (newest first) and term type.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/teacher/reports/terms", user.userId);

    const terms = await termService.getReportTermsList();

    return ApiResponse.success({ terms });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/teacher/reports/terms",
    });
  }
});
