import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherProfileService } from "@/features/teachers/teacher-profile.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/teacher/profile
 *
 * Get the complete profile for the logged-in teacher including:
 * - Personal information
 * - Department and subjects
 * - Class teacher assignments
 *
 * SECURITY: Only TEACHER role can access their own profile
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/teacher/profile", user.userId);

    // Authorization check: Only teachers can access this endpoint
    if (user.role !== "TEACHER") {
      logger.warn("Unauthorized role attempting to access teacher profile", {
        userId: user.userId,
        role: user.role,
      });
      return ApiResponse.forbidden("Only teachers can access this endpoint");
    }

    const profile = await teacherProfileService.getProfileByUserId(user.userId);

    return ApiResponse.success(profile);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/teacher/profile",
    });
  }
});
