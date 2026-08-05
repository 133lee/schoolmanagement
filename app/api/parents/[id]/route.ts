import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { parentService } from "@/features/parents/parent.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/parents/[id]
 * Get a single guardian by ID
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Parent ID is required");
      }

      const { searchParams } = new URL(request.url);
      const includeRelations = searchParams.get("include") === "relations";

      const parent = includeRelations
        ? await parentService.getParentByIdWithRelations(id, context)
        : await parentService.getParentById(id, context);

      return ApiResponse.success(parent);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/parents/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/parents/[id]
 * Update a guardian
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Parent ID is required");
      }

      const body = await request.json();
      const parent = await parentService.updateParent(id, body, context);

      return ApiResponse.success(parent);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/parents/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/parents/[id]
 * Delete a guardian
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Parent ID is required");
      }

      const parent = await parentService.deleteParent(id, context);

      return ApiResponse.success(parent);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/parents/${(await params).id}`,
      });
    }
  }
);
