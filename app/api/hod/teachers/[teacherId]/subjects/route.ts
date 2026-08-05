import { NextRequest } from "next/server";
import { withHODAccess } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { logger } from "@/lib/logger/logger";
import { hodService } from "@/features/hod/hod.service";

/**
 * GET /api/hod/teachers/[teacherId]/subjects
 *
 * Get subjects a specific teacher is qualified to teach
 * Only returns subjects that are:
 * 1. In the HOD's department
 * 2. The teacher is qualified for (has TeacherSubject relationship)
 */
export const GET = withHODAccess(
  async (request: NextRequest, user, { params }) => {
    const { teacherId } = await params;
    try {
      logger.logRequest("GET", `/api/hod/teachers/${teacherId}/subjects`, user.userId);

      const subjects = await hodService.getTeacherSubjects(user.userId, teacherId);

      return ApiResponse.success(subjects);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `/api/hod/teachers/${teacherId}/subjects`,
      });
    }
  }
);
