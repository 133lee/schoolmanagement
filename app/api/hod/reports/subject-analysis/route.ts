import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherGradebookService } from "@/features/teachers/teacher-gradebook.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/hod/reports/subject-analysis
 *
 * Get grade distribution and analysis for an assessment.
 * HOD can only access classes that have subjects from their department.
 *
 * Query params:
 * - subjectId: The subject ID (required)
 * - classId: The class ID (required)
 * - assessmentType: Assessment type (CAT1, MID, EOT) - default: "CAT1"
 * - termId: The term ID (optional - uses active term if not provided)
 */
export const GET = withHODAccess(async (request: NextRequest, user) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const subjectId = searchParams.get("subjectId");
    const classId = searchParams.get("classId");
    const assessmentType = searchParams.get("assessmentType") || "CAT1";
    const termId = searchParams.get("termId") || undefined;

    logger.logRequest("GET", "/api/hod/reports/subject-analysis", user.userId, {
      subjectId,
      classId,
      assessmentType,
      termId,
    });

    const analysisData = await teacherGradebookService.getAssessmentAnalysisForHOD(
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
      endpoint: "/api/hod/reports/subject-analysis",
    });
  }
});
