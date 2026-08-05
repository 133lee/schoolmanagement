import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherReportService } from "@/features/teachers/teacher-report.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/teacher/reports/classes
 *
 * Get all classes where the teacher teaches (for report viewing).
 * Returns deduplicated list of classes with student counts.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/teacher/reports/classes", user.userId);

    const classes = await teacherReportService.getClassesForReports(user.userId);

    return ApiResponse.success(classes);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/teacher/reports/classes",
    });
  }
});
