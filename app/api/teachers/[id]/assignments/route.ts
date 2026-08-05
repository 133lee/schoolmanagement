import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { subjectTeacherAssignmentService } from "@/features/subject-teacher-assignments/subjectTeacherAssignment.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/teachers/[id]/assignments
 * Get assignments for a teacher
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const searchParams = request.nextUrl.searchParams;
      const academicYearId = searchParams.get("academicYearId") || undefined;

      const assignments = await subjectTeacherAssignmentService.getTeacherAssignments(
        id,
        academicYearId,
        context
      );

      return ApiResponse.success(assignments);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/teachers/${(await params).id}/assignments`,
      });
    }
  }
);
