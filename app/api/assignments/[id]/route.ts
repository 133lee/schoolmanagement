import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { subjectTeacherAssignmentService } from "@/features/subject-teacher-assignments/subjectTeacherAssignment.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/assignments/[id]
 * Get assignment by ID with relations
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const assignment = await subjectTeacherAssignmentService.getAssignmentWithRelations(
        id,
        context
      );

      return ApiResponse.success(assignment);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/assignments/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/assignments/[id]
 * Update assignment (change teacher)
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const body = await request.json();
      const { teacherId } = body;

      const assignment = await subjectTeacherAssignmentService.updateAssignment(
        id,
        { teacherId },
        context
      );

      return ApiResponse.success(assignment);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/assignments/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/assignments/[id]
 * Delete assignment
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      await subjectTeacherAssignmentService.deleteAssignment(id, context);

      return ApiResponse.success({ message: "Assignment deleted successfully" });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/assignments/${(await params).id}`,
      });
    }
  }
);
