import { NextRequest } from "next/server";
import { withAuth, type AuthUser } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { BadRequestError } from "@/lib/http/errors";
import { attendanceRecordService } from "@/features/attendance/attendanceRecord.service";

/**
 * GET /api/teacher/classes/[classId]/session-register
 *
 * Returns the full period-attendance session record for a class + subject over
 * the given term.  Used by the Session Record sheet on the attendance page.
 *
 * Query params:
 *   subjectId  — the subject to filter by
 *   termId     — the term to filter by
 *
 * Response shape:
 * {
 *   termStartDate : "YYYY-MM-DD",
 *   termLabel     : "Term 1 · 2026",
 *   students      : [{ id, name, gender }],
 *   sessions      : [{ isoDate, records: { [studentId]: status } }]
 * }
 *
 * Sessions are ordered by date asc.
 * For double periods on the same day only the earlier period's records are
 * included (auto-fill makes them identical; teacher corrections to the second
 * half can be viewed by opening that period separately).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  return withAuth(async (req: NextRequest, user: AuthUser) => {
    const { classId } = await params;

    try {
      const { searchParams } = request.nextUrl;
      const subjectId = searchParams.get("subjectId");
      const termId = searchParams.get("termId");

      if (!subjectId || !termId) {
        throw new BadRequestError("subjectId and termId are required");
      }

      const result = await attendanceRecordService.getSessionRegister(
        user.userId,
        classId,
        subjectId,
        termId
      );

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `/api/teacher/classes/${classId}/session-register`,
      });
    }
  })(request, {} as never);
}
