import { NextRequest } from "next/server";
import { withRole } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { reportService } from "@/features/reports/report.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/admin/reports/subjects
 *
 * Get all subjects for admin reports filtering
 */
export const GET = withRole(["ADMIN", "HEAD_TEACHER"], async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/admin/reports/subjects", user.userId);

    const subjects = await reportService.getAllSubjects();

    return ApiResponse.success({ subjects });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/admin/reports/subjects",
    });
  }
});
