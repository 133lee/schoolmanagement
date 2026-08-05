import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { adminProfileService } from "@/features/admin/adminProfile.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/admin/profile/email
 * Update email address
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const body = await request.json();
    const { newEmail, password } = body;

    if (!newEmail || !password) {
      return ApiResponse.badRequest("Email and password are required");
    }

    const updatedProfile = await adminProfileService.updateEmail(context, { newEmail, password });

    return ApiResponse.success(updatedProfile, { message: "Email updated successfully" });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/admin/profile/email" });
  }
});
