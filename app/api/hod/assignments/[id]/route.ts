import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { getHODDepartment } from "@/lib/auth/position-helpers";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { subjectTeacherAssignmentService } from "@/features/subject-teacher-assignments/subjectTeacherAssignment.service";
import { logger } from "@/lib/logger/logger";
import { Role } from "@/types/prisma-enums";

/**
 * GET /api/hod/assignments/[id]
 *
 * Get a single assignment by ID
 * Validates that assignment belongs to HOD's department
 */
export const GET = withHODAccess(
  async (request: NextRequest, user, { params}) => {
    try {
      const { id } = await params;
      logger.logRequest("GET", `/api/hod/assignments/${id}`, user.userId);

      // Get HOD's department
      const hodDept = await getHODDepartment(user.userId);
      if (!hodDept) {
        return ApiResponse.forbidden("Not assigned as HOD of any department");
      }

      // Fetch assignment with relations
      const assignment = await subjectTeacherAssignmentService.getAssignmentWithRelations(
        id,
        { userId: user.userId, role: user.role as Role }
      );

      // Validate assignment belongs to HOD's department
      if (assignment.subject.departmentId !== hodDept.id) {
        return ApiResponse.forbidden(
          "This assignment does not belong to your department"
        );
      }

      // Validate assignment is for secondary grade
      const SECONDARY_GRADES = [
        "GRADE_8",
        "GRADE_9",
        "GRADE_10",
        "GRADE_11",
        "GRADE_12",
      ];
      if (!SECONDARY_GRADES.includes(assignment.class.grade.level)) {
        return ApiResponse.forbidden(
          "HOD can only view assignments for secondary grades (8-12)"
        );
      }

      return ApiResponse.success(assignment);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `/api/hod/assignments/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/hod/assignments/[id]
 *
 * Update an assignment (change teacher)
 * Validates:
 * - Assignment belongs to HOD's department
 * - Assignment is for secondary grade
 * - New teacher (if provided) belongs to department
 */
export const PATCH = withHODAccess(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      logger.logRequest("PATCH", `/api/hod/assignments/${id}`, user.userId);

      // Get HOD's department
      const hodDept = await getHODDepartment(user.userId);
      if (!hodDept) {
        return ApiResponse.forbidden("Not assigned as HOD of any department");
      }

      // Parse request body
      const body = await request.json();
      const { teacherId } = body;

      if (!teacherId) {
        return ApiResponse.badRequest("Missing required field: teacherId");
      }

      // Update assignment with department scoping
      const updatedAssignment =
        await subjectTeacherAssignmentService.updateAssignmentForHOD(
          id,
          { teacherId },
          { userId: user.userId, role: user.role as Role, departmentId: hodDept.id }
        );

      return ApiResponse.success(updatedAssignment);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `/api/hod/assignments/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/hod/assignments/[id]
 *
 * Delete an assignment
 * Validates:
 * - Assignment belongs to HOD's department
 * - Assignment is for secondary grade
 * - Academic year is not closed
 */
export const DELETE = withHODAccess(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      logger.logRequest("DELETE", `/api/hod/assignments/${id}`, user.userId);

      // Get HOD's department
      const hodDept = await getHODDepartment(user.userId);
      if (!hodDept) {
        return ApiResponse.forbidden("Not assigned as HOD of any department");
      }

      // Delete assignment with department scoping
      await subjectTeacherAssignmentService.deleteAssignmentForHOD(id, {
        userId: user.userId,
        role: user.role as Role,
        departmentId: hodDept.id,
      });

      return ApiResponse.noContent();
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `/api/hod/assignments/${(await params).id}`,
      });
    }
  }
);
