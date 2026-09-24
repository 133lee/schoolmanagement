import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { getHODDepartment } from "@/lib/auth/position-helpers";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { subjectTeacherAssignmentService } from "@/features/subject-teacher-assignments/subjectTeacherAssignment.service";
import { logger } from "@/lib/logger/logger";
import { Role } from "@/types/prisma-enums";

/**
 * GET /api/hod/assignments
 *
 * List all subject-teacher assignments for HOD's department
 * Automatically scoped to:
 * - Subjects in HOD's department
 * - Secondary grades only (8-12)
 */
export const GET = withHODAccess(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/hod/assignments", user.userId);

    // Get HOD's department
    const hodDept = await getHODDepartment(user.userId);
    if (!hodDept) {
      return ApiResponse.forbidden("Not assigned as HOD of any department");
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      academicYearId: searchParams.get("academicYearId") || undefined,
      teacherId: searchParams.get("teacherId") || undefined,
      subjectId: searchParams.get("subjectId") || undefined,
      classId: searchParams.get("classId") || undefined,
    };

    const pagination = {
      page: parseInt(searchParams.get("page") || "1"),
      pageSize: parseInt(searchParams.get("pageSize") || "20"),
    };

    // Fetch assignments with department scoping
    const result = await subjectTeacherAssignmentService.listAssignmentsForHOD(
      filters,
      pagination,
      { userId: user.userId, role: user.role as Role, departmentId: hodDept.id }
    );

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/hod/assignments",
    });
  }
});

/**
 * POST /api/hod/assignments
 *
 * Create a new subject-teacher assignment
 * Validates:
 * - Subject belongs to HOD's department
 * - Teacher belongs to HOD's department
 * - Class is secondary grade (8-12)
 */
export const POST = withHODAccess(async (request: NextRequest, user) => {
  try {
    logger.logRequest("POST", "/api/hod/assignments", user.userId);

    // Get HOD's department
    const hodDept = await getHODDepartment(user.userId);
    if (!hodDept) {
      return ApiResponse.forbidden("Not assigned as HOD of any department");
    }

    // Parse request body
    const body = await request.json();
    const { teacherId, subjectId, classId, academicYearId, classSubjectId } = body;

    // Validate required fields
    if (!teacherId || !subjectId || !classId || !academicYearId) {
      return ApiResponse.badRequest("Missing required fields: teacherId, subjectId, classId, academicYearId");
    }

    // Create assignment with department scoping
    // classSubjectId is optional - if provided, it links directly to the curriculum item
    const assignment = await subjectTeacherAssignmentService.createAssignmentForHOD(
      { teacherId, subjectId, classId, academicYearId, classSubjectId },
      { userId: user.userId, role: user.role as Role, departmentId: hodDept.id }
    );

    return ApiResponse.created(assignment);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/hod/assignments",
    });
  }
});
