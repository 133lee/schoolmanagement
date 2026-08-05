import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { secondaryTimetableService } from "@/features/timetables/secondaryTimetable.service";
import { DayOfWeek } from "@/types/prisma-enums";

/**
 * GET /api/timetables/suggestions
 * Suggest available teachers or time slots for scheduling
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const timeSlotId = searchParams.get("timeSlotId");
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const teacherId = searchParams.get("teacherId");
    const termId = searchParams.get("termId");
    const dayOfWeek = searchParams.get("dayOfWeek") as DayOfWeek | null;

    if (!type || !termId || !dayOfWeek) {
      return ApiResponse.badRequest("Missing required fields: type, termId, dayOfWeek");
    }

    if (type === "available-teachers") {
      if (!timeSlotId || !classId || !subjectId) {
        return ApiResponse.badRequest(
          "Missing required fields for available-teachers: timeSlotId, classId, subjectId"
        );
      }

      const availableTeachers = await secondaryTimetableService.findAvailableTeachers(
        subjectId,
        classId,
        termId,
        dayOfWeek,
        timeSlotId
      );

      return ApiResponse.success({ availableTeachers });
    }

    if (type === "available-timeslots") {
      if (!teacherId || !classId) {
        return ApiResponse.badRequest(
          "Missing required fields for available-timeslots: teacherId, classId"
        );
      }

      const availableSlots = await secondaryTimetableService.findAvailableTimeSlots(
        teacherId,
        classId,
        termId,
        dayOfWeek
      );

      return ApiResponse.success({ availableSlots });
    }

    return ApiResponse.badRequest("Invalid type. Must be 'available-teachers' or 'available-timeslots'");
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/timetables/suggestions" });
  }
});
