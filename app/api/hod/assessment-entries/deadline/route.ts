import { NextRequest } from "next/server";
import { withHODAccess, AuthUser } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { hodAssessmentEntriesService } from "@/features/hod/hodAssessmentEntries.service";

/**
 * PATCH /api/hod/assessment-entries/deadline
 * Extend the AssessmentWindow closesAt for a given termId + examType.
 * HOD can only extend windows for assessments within their department.
 */
export const PATCH = withHODAccess(async (request: NextRequest, user: AuthUser) => {
  try {
    const body = await request.json();
    const { termId, examType, newDeadline } = body;

    const result = await hodAssessmentEntriesService.extendDeadline(
      user.userId,
      termId,
      examType,
      newDeadline
    );

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "PATCH /api/hod/assessment-entries/deadline",
    });
  }
});
