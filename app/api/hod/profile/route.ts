import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { logger } from "@/lib/logger/logger";
import { hodService } from "@/features/hod/hod.service";

/**
 * GET /api/hod/profile
 *
 * Get the complete profile for the logged-in HOD including:
 * - User information (email, role)
 * - Department information
 * - Department statistics (subjects, teachers)
 *
 * SECURITY: Only HOD role can access their own profile
 */
export const GET = withHODAccess(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/hod/profile", user.userId);

    const profile = await hodService.getProfile(user.userId);

    return ApiResponse.success(profile);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/hod/profile",
    });
  }
});
