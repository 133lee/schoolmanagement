import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { adminProfileService } from "@/features/admin/adminProfile.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/admin/profile
 * Get current user's profile
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const profile = await adminProfileService.getProfile(context);
    return ApiResponse.success(profile);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/admin/profile" });
  }
});

/**
 * PATCH /api/admin/profile
 * Update current user's profile
 */
export const PATCH = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const body = await request.json();
    const { firstName, middleName, lastName, phone, address } = body;

    const updatedProfile = await adminProfileService.updateProfile(context, {
      firstName,
      middleName,
      lastName,
      phone,
      address,
    });

    return ApiResponse.success(updatedProfile);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "PATCH /api/admin/profile" });
  }
});
