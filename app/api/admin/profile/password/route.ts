import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { adminProfileService } from "@/features/admin/adminProfile.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/admin/profile/password
 * Change password
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return ApiResponse.badRequest("All password fields are required");
    }

    await adminProfileService.changePassword(context, {
      currentPassword,
      newPassword,
      confirmPassword,
    });

    return ApiResponse.success({ message: "Password changed successfully" });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/admin/profile/password" });
  }
});
