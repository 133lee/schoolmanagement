import { NextRequest } from "next/server";
import { withHODAccess, AuthUser } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { logger } from "@/lib/logger/logger";
import { hodAssessmentEntriesService } from "@/features/hod/hodAssessmentEntries.service";

/**
 * GET /api/hod/assessment-entries
 *
 * Get assessment entry progress for all teachers in HOD's department
 * Returns:
 * - List of teacher assessment entries with progress
 * - Dashboard statistics
 * - Filter options
 */
export const GET = withHODAccess(async (request: NextRequest, user: AuthUser) => {
  try {
    logger.logRequest("GET", "/api/hod/assessment-entries", user.userId);

    const { searchParams } = new URL(request.url);
    const result = await hodAssessmentEntriesService.getAssessmentEntries(user.userId, {
      termId: searchParams.get("termId") || undefined,
      assessmentType: searchParams.get("assessmentType") || undefined,
      classId: searchParams.get("classId") || undefined,
      teacherId: searchParams.get("teacherId") || undefined,
      status: searchParams.get("status") || undefined,
    });

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/hod/assessment-entries",
    });
  }
});
