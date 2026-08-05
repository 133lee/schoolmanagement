import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { getHODDepartment } from "@/lib/auth/position-helpers";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { subjectTeacherAssignmentService } from "@/features/subject-teacher-assignments/subjectTeacherAssignment.service";
import { logger } from "@/lib/logger/logger";

/**
 * POST /api/hod/assignments/bulk
 *
 * Bulk create assignments for a class
 * Validates:
 * - All subjects belong to HOD's department
 * - All teachers belong to HOD's department
 * - Class is secondary grade (8-12)
 */
export const POST = withHODAccess(async (request: NextRequest, user) => {
  try {
    logger.logRequest("POST", "/api/hod/assignments/bulk", user.userId);

    // Get HOD's department
    const hodDept = await getHODDepartment(user.userId);
    if (!hodDept) {
      return ApiResponse.forbidden("Not assigned as HOD of any department");
    }

    // Parse request body
    const body = await request.json();
    const { classId, academicYearId, assignments } = body;

    // Validate required fields
    if (!classId || !academicYearId || !Array.isArray(assignments)) {
      return ApiResponse.badRequest(
        "Missing required fields: classId, academicYearId, assignments (array)"
      );
    }

    // Validate each assignment has required fields
    for (const assignment of assignments) {
      if (!assignment.teacherId || !assignment.subjectId) {
        return ApiResponse.badRequest(
          "Each assignment must have teacherId and subjectId"
        );
      }
    }

    // Bulk assign with department scoping
    const result = await subjectTeacherAssignmentService.bulkAssignForHOD(
      { classId, academicYearId, assignments },
      { userId: user.userId, role: user.role as any, departmentId: hodDept.id }
    );

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/hod/assignments/bulk",
    });
  }
});
