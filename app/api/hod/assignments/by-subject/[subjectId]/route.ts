import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { getHODDepartment } from "@/lib/auth/position-helpers";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { subjectTeacherAssignmentService } from "@/features/subject-teacher-assignments/subjectTeacherAssignment.service";
import { logger } from "@/lib/logger/logger";
import { subjectRepository } from "@/features/subjects/subject.repository";

/**
 * GET /api/hod/assignments/by-subject/[subjectId]
 *
 * Get all assignments for a specific subject
 * Validates that subject belongs to HOD's department
 * Only returns assignments for secondary grades (8-12)
 */
export const GET = withHODAccess(
  async (request: NextRequest, user, { params }) => {
    try {
      const { subjectId } = await params;
      logger.logRequest(
        "GET",
        `/api/hod/assignments/by-subject/${subjectId}`,
        user.userId
      );

      // Get HOD's department
      const hodDept = await getHODDepartment(user.userId);
      if (!hodDept) {
        return ApiResponse.forbidden("Not assigned as HOD of any department");
      }

      // Validate subject belongs to HOD's department
      const subject = await subjectRepository.findById(subjectId);
      if (!subject) {
        return ApiResponse.notFound("Subject not found");
      }

      if (subject.departmentId !== hodDept.id) {
        return ApiResponse.forbidden(
          "This subject does not belong to your department"
        );
      }

      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const academicYearId = searchParams.get("academicYearId") || undefined;

      // Fetch assignments with department scoping
      const result = await subjectTeacherAssignmentService.listAssignmentsForHOD(
        { subjectId, academicYearId },
        { page: 1, pageSize: 100 }, // No pagination for subject view
        { userId: user.userId, role: user.role as any, departmentId: hodDept.id }
      );

      return ApiResponse.success(result.data);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `/api/hod/assignments/by-subject/${(await params).subjectId}`,
      });
    }
  }
);
