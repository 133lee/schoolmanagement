import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherReportService } from "@/features/teachers/teacher-report.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/teacher/reports
 *
 * Fetch report cards for a specific class and term.
 * Includes comprehensive statistics (averages, pass rates, attendance).
 *
 * Query params:
 * - classId: The class ID (required)
 * - termId: The term ID (required)
 * - subjectId: The subject ID (optional - for subject teachers)
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const termId = searchParams.get("termId");
    const subjectId = searchParams.get("subjectId");

    if (!classId || !termId) {
      return ApiResponse.badRequest("classId and termId are required");
    }

    logger.logRequest("GET", "/api/teacher/reports", user.userId, {
      classId,
      termId,
      subjectId,
    });

    const reportData = await teacherReportService.getReportCardsForClass(
      user.userId,
      classId,
      termId,
      subjectId || undefined
    );

    return ApiResponse.success(reportData);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/teacher/reports",
    });
  }
});
