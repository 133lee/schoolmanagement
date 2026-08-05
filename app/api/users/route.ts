import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { logger } from "@/lib/logger/logger";
import { userManagementService } from "@/features/permissions/userManagement.service";
import { Role } from "@/types/prisma-enums";

/**
 * GET /api/users
 *
 * Get users with optional role filter
 * Query params:
 * - role: Filter by user role (optional)
 *
 * SECURITY: Only ADMIN role can access this endpoint
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/users", user.userId);

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");

    const users = await userManagementService.getActiveUsersList(roleFilter, {
      userId: user.userId,
      role: user.role as Role,
    });

    logger.info("Users fetched successfully", {
      userId: user.userId,
      count: users.length,
      roleFilter,
    });

    return ApiResponse.success(users);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/users",
    });
  }
});
