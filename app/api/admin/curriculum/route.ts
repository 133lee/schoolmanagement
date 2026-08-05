import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { curriculumManagementService } from "@/features/curriculum-management/curriculumManagement.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/admin/curriculum
 * Get all grades with their assigned subjects
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const result = await curriculumManagementService.getAllGradesWithSubjects(context);
    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/admin/curriculum" });
  }
});

/**
 * POST /api/admin/curriculum
 * Assign a subject to a grade
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const body = await request.json();
    const { gradeId, subjectId, isCore } = body;

    if (!gradeId || !subjectId || typeof isCore !== "boolean") {
      return ApiResponse.badRequest("Missing required fields: gradeId, subjectId, isCore");
    }

    const result = await curriculumManagementService.assignSubjectToGrade(
      { gradeId, subjectId, isCore },
      context
    );

    return ApiResponse.created(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/admin/curriculum" });
  }
});

/**
 * PUT /api/admin/curriculum
 * Bulk assign subjects to a grade (replaces existing)
 */
export const PUT = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const body = await request.json();
    const { gradeId, subjects } = body;

    if (!gradeId || !Array.isArray(subjects)) {
      return ApiResponse.badRequest("Missing required fields: gradeId, subjects (array)");
    }

    const result = await curriculumManagementService.bulkAssignSubjectsToGrade(
      { gradeId, subjects },
      context
    );

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "PUT /api/admin/curriculum" });
  }
});
