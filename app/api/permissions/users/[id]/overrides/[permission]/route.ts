import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { userManagementService } from "@/features/permissions/userManagement.service";
import { Role, Permission } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * DELETE /api/permissions/users/[id]/overrides/[permission]
 * Remove a permission override from a user
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id, permission } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      await userManagementService.removePermissionOverride(
        id,
        permission as Permission,
        context
      );

      return ApiResponse.success({ message: "Permission override removed successfully" });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/permissions/users/${(await params).id}/overrides/${(await params).permission}`,
      });
    }
  }
);
