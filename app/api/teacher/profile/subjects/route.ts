import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherProfileService } from "@/features/teachers/teacher-profile.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/teacher/profile/subjects
 *
 * Get list of subjects taught by the authenticated teacher.
 * Returns deduplicated list of subjects.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/teacher/profile/subjects", user.userId);

    const subjects = await teacherProfileService.getTeacherSubjects(user.userId);

    return ApiResponse.success({ subjects });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/teacher/profile/subjects",
    });
  }
});
