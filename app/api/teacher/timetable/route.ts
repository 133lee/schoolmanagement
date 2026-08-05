import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { timetableService } from "@/features/timetables/timetable.service";
import { teacherService } from "@/features/teachers/teacher.service";
import { logger } from "@/lib/logger/logger";
import { NotFoundError } from "@/lib/http/errors";
import { Role } from "@/types/prisma-enums";

/**
 * GET /api/teacher/timetable
 *
 * Get the authenticated teacher's personal timetable.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    logger.logRequest("GET", "/api/teacher/timetable", user.userId);

    const context = { userId: user.userId, role: user.role as Role };
    const teacherProfile = await teacherService.getTeacherByUserId(user.userId, context);

    if (!teacherProfile) {
      throw new NotFoundError("Teacher profile not found");
    }

    // Note: timetableService already has authorization logic
    const result = await timetableService.getTeacherTimetable(teacherProfile.id, {
      userId: user.userId,
      role: user.role as "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK",
      teacherProfileId: teacherProfile.id,
    });

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/teacher/timetable",
    });
  }
});
