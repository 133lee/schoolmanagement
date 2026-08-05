import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { secondaryTimetableService } from "@/features/timetables/secondaryTimetable.service";

/**
 * POST /api/timetables/check-availability
 * Check whether a teacher or class is free at a given term/day/time slot
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json();
    const { type, timeSlotId, classId, teacherId, termId, dayOfWeek } = body;

    if (!type || !timeSlotId || !termId || !dayOfWeek) {
      return ApiResponse.badRequest("Missing required fields: type, timeSlotId, termId, dayOfWeek");
    }

    if (type === "teacher") {
      if (!teacherId) {
        return ApiResponse.badRequest("teacherId is required for teacher availability check");
      }

      const result = await secondaryTimetableService.checkTeacherAvailabilityDetailed(
        teacherId,
        termId,
        dayOfWeek,
        timeSlotId
      );

      return ApiResponse.success(result);
    }

    if (type === "class") {
      if (!classId) {
        return ApiResponse.badRequest("classId is required for class availability check");
      }

      const result = await secondaryTimetableService.checkClassAvailabilityDetailed(
        classId,
        termId,
        dayOfWeek,
        timeSlotId
      );

      return ApiResponse.success(result);
    }

    return ApiResponse.badRequest("Invalid type. Must be 'teacher' or 'class'");
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/timetables/check-availability" });
  }
});
