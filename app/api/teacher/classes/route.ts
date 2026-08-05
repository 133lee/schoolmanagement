import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherClassService } from "@/features/teachers/teacher-class.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/teacher/classes
 *
 * Get all classes assigned to the logged-in teacher:
 * - As class teacher: Classes they manage
 * - As subject teacher: Classes where they teach specific subjects
 * - Combined view with deduplication
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/teacher/classes", user.userId);

    const classes = await teacherClassService.getClassesForTeacher(user.userId);

    return ApiResponse.success(classes);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/teacher/classes",
    });
  }
});
