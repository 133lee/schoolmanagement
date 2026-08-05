import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { authService } from "@/features/auth/auth.service";
import { checkRateLimit } from "@/lib/http/rate-limit";

/**
 * POST /api/auth/change-password
 * Change the logged-in user's own password
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const rl = checkRateLimit(`change-password:${user.userId}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return ApiResponse.badRequest("Current password and new password are required");
    }

    await authService.changePassword(user.userId, currentPassword, newPassword);

    return ApiResponse.success({ message: "Password changed successfully" });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/auth/change-password" });
  }
});
