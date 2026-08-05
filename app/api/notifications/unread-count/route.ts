import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { notificationService } from "@/features/notifications/notification.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications for the logged-in user
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const count = await notificationService.getUnreadCount(context);

    return ApiResponse.success({ count });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/notifications/unread-count" });
  }
});
