import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { ValidationError } from "@/lib/http/errors";
import { lessonLogService } from "@/features/lesson-logs/lessonLog.service";
import { slotDateQuerySchema } from "@/features/lesson-logs/lessonLog.validation";
import { Role } from "@/types/prisma-enums";

/**
 * GET /api/teacher/attendance/remedial?timetableSlotId=&date=
 *
 * The remedial view for a single period: the topic logged for that lesson
 * (if any) and every student who was marked ABSENT for it.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context = { userId: user.userId, role: user.role as Role };
    const { searchParams } = new URL(request.url);

    const parsed = slotDateQuerySchema.safeParse({
      timetableSlotId: searchParams.get("timetableSlotId"),
      date: searchParams.get("date"),
    });
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", parsed.error.flatten().fieldErrors);
    }

    const view = await lessonLogService.getRemedialView(
      parsed.data.timetableSlotId,
      parsed.data.date,
      context
    );

    return ApiResponse.success(view);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "GET /api/teacher/attendance/remedial",
    });
  }
});
