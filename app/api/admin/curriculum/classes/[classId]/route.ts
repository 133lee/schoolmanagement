import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { curriculumManagementService } from "@/features/curriculum-management/curriculumManagement.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/admin/curriculum/classes/[classId]
 * Get all subjects assigned to a class/stream
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { classId } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const result = await curriculumManagementService.getSubjectsByClass(classId, context);

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/admin/curriculum/classes/${(await params).classId}`,
      });
    }
  }
);
