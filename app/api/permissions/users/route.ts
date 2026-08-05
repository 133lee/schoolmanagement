import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { userManagementService } from "@/features/permissions/userManagement.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/permissions/users
 * List all users with their permissions for permissions management
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const role = (searchParams.get("role") as Role | null) || undefined;
    const status = (searchParams.get("status") as "active" | "inactive" | null) || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const result = await userManagementService.listUsers(
      { search, role, status },
      { page, pageSize },
      context
    );

    return ApiResponse.success(result.data, result.meta);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/permissions/users" });
  }
});
