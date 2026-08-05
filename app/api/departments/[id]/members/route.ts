import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { departmentService } from "@/features/departments/department.service";
import { Role } from "@/types/prisma-enums";
import { logger } from "@/lib/logger/logger";

/**
 * POST /api/departments/[id]/members
 *
 * Add teachers to a department
 * Body:
 * - teacherIds: string[] - Array of teacher IDs to add
 *
 * SECURITY: Only ADMIN role can manage department members
 */
export async function POST(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req: NextRequest, user) => {
    try {
      const params = await segmentData.params;
      const departmentId = params.id;
      logger.logRequest("POST", `/api/departments/${departmentId}/members`, user.userId);

      const body = await req.json();
      const { teacherIds } = body;

      const result = await departmentService.addMembers(departmentId, teacherIds, {
        userId: user.userId,
        role: user.role as Role,
      });

      logger.info("Teachers added to department", {
        userId: user.userId,
        departmentId,
        teacherCount: teacherIds?.length,
      });

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `/api/departments/[id]/members`,
      });
    }
  })(request, {} as never);
}

/**
 * DELETE /api/departments/[id]/members
 *
 * Remove a teacher from a department
 * Body:
 * - teacherId: string - Teacher ID to remove
 *
 * SECURITY: Only ADMIN role can manage department members
 */
export async function DELETE(
  request: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req: NextRequest, user) => {
    try {
      const params = await segmentData.params;
      const departmentId = params.id;
      logger.logRequest("DELETE", `/api/departments/${departmentId}/members`, user.userId);

      const body = await req.json();
      const { teacherId } = body;

      const result = await departmentService.removeMember(departmentId, teacherId, {
        userId: user.userId,
        role: user.role as Role,
      });

      logger.info("Teacher removed from department", {
        userId: user.userId,
        departmentId,
        teacherId,
      });

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `/api/departments/[id]/members`,
      });
    }
  })(request, {} as never);
}
