import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { reportService } from "@/features/reports/report.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/hod/reports/classes
 *
 * Get classes for a specific grade
 */
export const GET = withHODAccess(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/hod/reports/classes", user.userId);

    const { searchParams } = new URL(request.url);
    const gradeId = searchParams.get("gradeId");

    if (!gradeId) {
      return ApiResponse.error("Grade ID is required", 400);
    }

    const classes = await reportService.getClassesByGradeForHOD(user.userId, gradeId);

    return ApiResponse.success({ classes });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/hod/reports/classes",
    });
  }
});
