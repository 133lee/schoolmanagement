import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherGradebookService } from "@/features/teachers/teacher-gradebook.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/teacher/gradebook/analysis
 *
 * Get grade distribution and analysis for an assessment.
 *
 * Query params:
 * - subjectId: The subject ID (required)
 * - classId: The class ID (required)
 * - assessmentType: Assessment type (CAT1, MID, EOT) - default: "CAT1"
 * - termId: The term ID (optional - uses active term if not provided)
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      // Get query parameters
      const searchParams = request.nextUrl.searchParams;
      const subjectId = searchParams.get("subjectId");
      const classId = searchParams.get("classId");
      const assessmentType = searchParams.get("assessmentType") || "CAT1";
      const termId = searchParams.get("termId") || undefined;

      logger.logRequest("GET", "/api/teacher/gradebook/analysis", user.userId, {
        subjectId,
        classId,
        assessmentType,
        termId,
      });

      const analysisData = await teacherGradebookService.getAssessmentAnalysis(
        user.userId,
        subjectId!,
        classId!,
        assessmentType,
        termId
      );

      return ApiResponse.success(analysisData);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: "/api/teacher/gradebook/analysis",
      });
    }
  })(request);
}
