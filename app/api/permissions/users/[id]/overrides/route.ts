import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { userManagementService } from "@/features/permissions/userManagement.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/permissions/users/[id]/overrides
 * Add a permission override for a user
 */
export const POST = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const body = await request.json();
      const { permission, expiresAt, reason } = body;

      const override = await userManagementService.addPermissionOverride(
        id,
        { permission, expiresAt, reason },
        context
      );

      return ApiResponse.success(override, { message: "Permission override added successfully" });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `POST /api/permissions/users/${(await params).id}/overrides`,
      });
    }
  }
);
