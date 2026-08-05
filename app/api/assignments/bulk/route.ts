import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { subjectTeacherAssignmentService } from "@/features/subject-teacher-assignments/subjectTeacherAssignment.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/assignments/bulk
 * Bulk create assignments for a class
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const { classId, academicYearId, assignments } = body;

    if (!classId || !academicYearId || !Array.isArray(assignments)) {
      return ApiResponse.badRequest("Missing or invalid required fields");
    }

    const result = await subjectTeacherAssignmentService.bulkAssign(
      { classId, academicYearId, assignments },
      context
    );

    return ApiResponse.created(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/assignments/bulk" });
  }
});
