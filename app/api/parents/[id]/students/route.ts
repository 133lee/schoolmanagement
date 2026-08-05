import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { parentService } from "@/features/parents/parent.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/parents/[id]/students
 * Link a student to a parent/guardian
 */
export const POST = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id: guardianId } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!guardianId) {
        return ApiResponse.badRequest("Guardian ID is required");
      }

      const body = await request.json();
      const { studentId, relationship, isPrimary } = body;

      const link = await parentService.linkStudent(
        guardianId,
        { studentId, relationship, isPrimary },
        context
      );

      return ApiResponse.created(link);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `POST /api/parents/${(await params).id}/students`,
      });
    }
  }
);

/**
 * DELETE /api/parents/[id]/students?studentId=...
 * Unlink a student from a parent/guardian
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id: guardianId } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!guardianId) {
        return ApiResponse.badRequest("Guardian ID is required");
      }

      const { searchParams } = new URL(request.url);
      const studentId = searchParams.get("studentId");

      if (!studentId) {
        return ApiResponse.badRequest("Student ID is required");
      }

      await parentService.unlinkStudent(guardianId, studentId, context);

      return ApiResponse.success({ message: "Student unlinked from guardian successfully" });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/parents/${(await params).id}/students`,
      });
    }
  }
);
