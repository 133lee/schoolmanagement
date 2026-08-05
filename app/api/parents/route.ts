import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { parentService } from "@/features/parents/parent.service";
import { ParentStatus, VulnerabilityStatus, Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/parents
 * List all guardians with optional filters and pagination
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ParentStatus | null;
    const vulnerability = searchParams.get("vulnerability") as VulnerabilityStatus | null;
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const filters: { status?: ParentStatus; vulnerability?: VulnerabilityStatus; search?: string } = {};
    if (status) filters.status = status;
    if (vulnerability) filters.vulnerability = vulnerability;
    if (search) filters.search = search;

    const result = await parentService.getParents(filters, { page, pageSize }, context);

    return ApiResponse.success(result.data, result.meta);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/parents" });
  }
});

/**
 * POST /api/parents
 * Create a new guardian
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const parent = await parentService.createParent(body, context);

    return ApiResponse.created(parent);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/parents" });
  }
});
