import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { ValidationError } from "@/lib/http/errors";
import { lessonLogService } from "@/features/lesson-logs/lessonLog.service";
import { logLessonSchema, slotDateQuerySchema } from "@/features/lesson-logs/lessonLog.validation";
import { Role } from "@/types/prisma-enums";

/**
 * GET /api/lesson-logs?timetableSlotId=&date=
 * Fetch the existing lesson log for a slot+date, if any.
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

    const log = await lessonLogService.getLessonLog(
      parsed.data.timetableSlotId,
      parsed.data.date,
      context
    );

    return ApiResponse.success({ log });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/lesson-logs" });
  }
});

/**
 * POST /api/lesson-logs
 * Log (create or update) what topic/subtopic(s) a lesson covered.
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context = { userId: user.userId, role: user.role as Role };
    const body = await request.json();

    const parsed = logLessonSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid lesson log data", parsed.error.flatten().fieldErrors);
    }

    const log = await lessonLogService.logLesson(parsed.data, context);

    return ApiResponse.success({ log });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/lesson-logs" });
  }
});
