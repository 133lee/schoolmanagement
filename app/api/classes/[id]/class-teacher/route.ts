import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { classService } from "@/features/classes/class.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/classes/[id]/class-teacher
 * Assign or reassign a class teacher
 * For PRIMARY grades (1-7), also auto-assigns teacher to all subjects
 */
export const POST = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Class ID is required");
      }

      const body = await request.json();
      const { teacherId } = body;

      if (!teacherId) {
        return ApiResponse.badRequest("Teacher ID is required");
      }

      const result = await classService.assignClassTeacher(id, teacherId, context);

      return ApiResponse.success(result, { message: "Class teacher assigned successfully" });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `POST /api/classes/${(await params).id}/class-teacher`,
      });
    }
  }
);

/**
 * DELETE /api/classes/[id]/class-teacher
 * Remove class teacher assignment
 * For PRIMARY grades (1-7), also removes all subject assignments
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Class ID is required");
      }

      const result = await classService.removeClassTeacher(id, context);

      return ApiResponse.success(result, { message: "Class teacher removed successfully" });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/classes/${(await params).id}/class-teacher`,
      });
    }
  }
);
