import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { departmentService } from "@/features/departments/department.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/departments/[id]
 * Get a single department by ID
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Department ID is required");
      }

      const { searchParams } = new URL(request.url);
      const includeRelations = searchParams.get("include") === "relations";

      const department = includeRelations
        ? await departmentService.getDepartmentByIdWithRelations(id, context)
        : await departmentService.getDepartmentById(id, context);

      if (!department) {
        return ApiResponse.notFound("Department not found");
      }

      return ApiResponse.success(department);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/departments/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/departments/[id]
 * Update a department's information
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Department ID is required");
      }

      const body = await request.json();
      const department = await departmentService.updateDepartment(id, body, context);

      return ApiResponse.success(department);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/departments/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/departments/[id]
 * Delete a department (hard delete - ADMIN only)
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Department ID is required");
      }

      const department = await departmentService.deleteDepartment(id, context);

      return ApiResponse.success(department);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/departments/${(await params).id}`,
      });
    }
  }
);
