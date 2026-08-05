import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { subjectTeacherAssignmentService } from "@/features/subject-teacher-assignments/subjectTeacherAssignment.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/assignments
 * List assignments with filters and pagination
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get("teacherId") || undefined;
    const subjectId = searchParams.get("subjectId") || undefined;
    const classId = searchParams.get("classId") || undefined;
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await subjectTeacherAssignmentService.listAssignments(
      { teacherId, subjectId, classId, academicYearId },
      { page, pageSize },
      context
    );

    return ApiResponse.success(result.data, result.pagination);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/assignments" });
  }
});

/**
 * POST /api/assignments
 * Create a new assignment
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const { teacherId, subjectId, classId, academicYearId } = body;

    if (!teacherId || !subjectId || !classId || !academicYearId) {
      return ApiResponse.badRequest("Missing required fields");
    }

    const assignment = await subjectTeacherAssignmentService.createAssignment(
      { teacherId, subjectId, classId, academicYearId },
      context
    );

    return ApiResponse.created(assignment);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/assignments" });
  }
});
