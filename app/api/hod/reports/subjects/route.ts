import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { reportService } from "@/features/reports/report.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/hod/reports/subjects
 *
 * Get all subjects for HOD reports filtering
 */
export const GET = withHODAccess(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/hod/reports/subjects", user.userId);

    const subjects = await reportService.getHODDepartmentSubjects(user.userId);

    return ApiResponse.success({ subjects });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/hod/reports/subjects",
    });
  }
});
