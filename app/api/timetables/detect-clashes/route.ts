import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { secondaryTimetableService } from "@/features/timetables/secondaryTimetable.service";

/**
 * GET /api/timetables/detect-clashes
 * Detect teacher/class double-bookings in a term
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get("termId");
    const classId = searchParams.get("classId") || undefined;

    if (!termId) {
      return ApiResponse.badRequest("Missing required field: termId");
    }

    const result = await secondaryTimetableService.detectClashes(termId, classId);

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/timetables/detect-clashes" });
  }
});
