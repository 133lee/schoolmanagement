import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { NotFoundError } from "@/lib/http/errors";
import { authService } from "@/features/auth/auth.service";

/**
 * GET /api/auth/me
 * Get current authenticated user's data
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const userData = await authService.getCurrentUser(user.userId);

    if (!userData) {
      throw new NotFoundError("User not found or inactive.");
    }

    return ApiResponse.success({
      id: userData.id,
      email: userData.email,
      role: userData.role,
      isActive: userData.isActive,
      lastLogin: userData.lastLogin,
      profile: userData.profile
        ? {
            id: userData.profile.id,
            staffNumber: userData.profile.staffNumber,
            firstName: userData.profile.firstName,
            middleName: userData.profile.middleName,
            lastName: userData.profile.lastName,
            phone: userData.profile.phone,
            status: userData.profile.status,
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/auth/me" });
  }
});
