import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { curriculumManagementService } from "@/features/curriculum-management/curriculumManagement.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * PUT /api/admin/curriculum/classes
 * Bulk assign subjects to a class/stream (replaces existing)
 */
export const PUT = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const body = await request.json();
    const { classId, subjects } = body;

    if (!classId || !Array.isArray(subjects)) {
      return ApiResponse.badRequest("Missing required fields: classId, subjects (array)");
    }

    const result = await curriculumManagementService.bulkAssignSubjectsToClass(
      { classId, subjects },
      context
    );

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "PUT /api/admin/curriculum/classes" });
  }
});
