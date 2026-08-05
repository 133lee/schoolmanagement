import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { curriculumManagementService } from "@/features/curriculum-management/curriculumManagement.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/admin/curriculum/grades/[gradeId]
 * Get subjects assigned to a specific grade
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { gradeId } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const result = await curriculumManagementService.getSubjectsByGrade(gradeId, context);

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/admin/curriculum/grades/${(await params).gradeId}`,
      });
    }
  }
);
