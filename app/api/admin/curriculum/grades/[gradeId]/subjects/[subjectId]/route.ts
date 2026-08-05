import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { curriculumManagementService } from "@/features/curriculum-management/curriculumManagement.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * PATCH /api/admin/curriculum/grades/[gradeId]/subjects/[subjectId]
 * Update isCore flag for a grade-subject assignment
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { gradeId, subjectId } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const body = await request.json();
      const { isCore } = body;

      if (typeof isCore !== "boolean") {
        return ApiResponse.badRequest("Missing required field: isCore (boolean)");
      }

      const result = await curriculumManagementService.updateSubjectCoreStatus(
        gradeId,
        subjectId,
        isCore,
        context
      );

      return ApiResponse.success(result);
    } catch (error) {
      const { gradeId, subjectId } = await params;
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/admin/curriculum/grades/${gradeId}/subjects/${subjectId}`,
      });
    }
  }
);

/**
 * DELETE /api/admin/curriculum/grades/[gradeId]/subjects/[subjectId]
 * Remove a subject from a grade
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { gradeId, subjectId } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      await curriculumManagementService.removeSubjectFromGrade(gradeId, subjectId, context);

      return ApiResponse.success({ message: "Subject removed from grade successfully" });
    } catch (error) {
      const { gradeId, subjectId } = await params;
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/admin/curriculum/grades/${gradeId}/subjects/${subjectId}`,
      });
    }
  }
);
