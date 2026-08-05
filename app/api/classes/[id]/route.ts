import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { classService } from "@/features/classes/class.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/classes/[id]
 * Get a single class by ID
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Class ID is required");
      }

      const { searchParams } = new URL(request.url);
      const includeRelations = searchParams.get("include") === "relations";

      const classEntity = includeRelations
        ? await classService.getClassByIdWithRelations(id, context)
        : await classService.getClassById(id, context);

      if (!classEntity) {
        return ApiResponse.notFound("Class not found");
      }

      return ApiResponse.success(classEntity);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/classes/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/classes/[id]
 * Update a class's information
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Class ID is required");
      }

      const body = await request.json();
      const classEntity = await classService.updateClass(id, body, context);

      return ApiResponse.success(classEntity);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/classes/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/classes/[id]
 * Delete a class (hard delete - ADMIN only)
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Class ID is required");
      }

      const classEntity = await classService.deleteClass(id, context);

      return ApiResponse.success(classEntity);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/classes/${(await params).id}`,
      });
    }
  }
);
