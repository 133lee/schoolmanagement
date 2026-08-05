import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { adminSubjectAnalysisService } from "@/features/admin/admin-subject-analysis.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/admin/reports/subject-analysis
 *
 * Get grade-level subject analysis aggregated across all streams.
 * Admin can view performance for entire grade (e.g., Grade 8A + 8B + 8C combined).
 *
 * Query params:
 * - gradeId: The grade ID (required)
 * - subjectId: The subject ID (required)
 * - termId: The term ID (required)
 * - assessmentType: Assessment type (CAT, MID, EOT) - default: "CAT"
 * - includeStreams: Include stream-by-stream breakdown (true/false) - default: false
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      // Get query parameters
      const searchParams = request.nextUrl.searchParams;
      const gradeId = searchParams.get("gradeId");
      const subjectId = searchParams.get("subjectId");
      const termId = searchParams.get("termId");
      const assessmentType = searchParams.get("assessmentType") || "CAT";
      const includeStreams = searchParams.get("includeStreams") === "true";
      const convention = searchParams.get("convention") as "standard" | "form" | null;

      if (!gradeId || !subjectId || !termId) {
        return ApiResponse.error("Grade ID, Subject ID, and Term ID are required", 400);
      }

      logger.logRequest("GET", "/api/admin/reports/subject-analysis", user.userId, {
        gradeId,
        subjectId,
        termId,
        assessmentType,
        includeStreams,
      });

      // Check if user has admin permissions
      if (!["ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD"].includes(user.role)) {
        return ApiResponse.error("Unauthorized. Admin access required.", 403);
      }

      let analysisData;

      if (includeStreams) {
        analysisData =
          await adminSubjectAnalysisService.getGradeLevelSubjectAnalysisWithStreams(
            gradeId,
            subjectId,
            termId,
            assessmentType,
            convention ?? undefined
          );
      } else {
        analysisData =
          await adminSubjectAnalysisService.getGradeLevelSubjectAnalysis(
            gradeId,
            subjectId,
            termId,
            assessmentType,
            convention ?? undefined
          );
      }

      return ApiResponse.success(analysisData);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: "/api/admin/reports/subject-analysis",
      });
    }
  })(request, {} as any);
}
