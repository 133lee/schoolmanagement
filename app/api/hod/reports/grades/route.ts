import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { reportService } from "@/features/reports/report.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/hod/reports/grades
 *
 * Get secondary grades (8-12) for HOD reports filtering
 * HOD can only manage and report on secondary grades
 */
export const GET = withHODAccess(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/hod/reports/grades", user.userId);

    const grades = await reportService.getSecondaryGrades();

    return ApiResponse.success({ grades });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/hod/reports/grades",
    });
  }
});
