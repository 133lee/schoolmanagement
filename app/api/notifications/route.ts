import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { notificationService } from "@/features/notifications/notification.service";
import { NotificationStatus, Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/notifications
 * Get notifications for the logged-in user
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") as NotificationStatus | null) || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await notificationService.listNotifications(
      { status },
      { limit, offset },
      context
    );

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/notifications" });
  }
});

/**
 * POST /api/notifications
 * Create a new notification (HOD sends to teacher)
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();

    const result = await notificationService.createNotification(body, context);

    return ApiResponse.created(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/notifications" });
  }
});
