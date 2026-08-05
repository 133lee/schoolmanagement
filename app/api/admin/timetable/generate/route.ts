import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { handleApiError } from "@/lib/http/error-handler";
import { ApiResponse } from "@/lib/http/api-response";
import { timetableService } from "@/features/timetables/timetable.service";
import { academicYearService } from "@/features/academic-years/academicYear.service";
import { teacherService } from "@/features/teachers/teacher.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/admin/timetable/generate
 *
 * Note: intentionally returns { message, stats, conflicts } at the top level
 * (not the standard envelope) — the generate page reads this shape directly.
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const baseContext: AuthContext = { userId: user.userId, role: user.role as Role };

    const academicYear = await academicYearService.getActiveAcademicYear(baseContext);
    if (!academicYear) {
      return ApiResponse.notFound("No active academic year found");
    }

    // Track who generated the timetable, when available
    const profile = await teacherService.getTeacherByUserId(user.userId, baseContext);

    const context = { ...baseContext, teacherProfileId: profile?.id };

    const result = await timetableService.generateTimetable(academicYear.id, context);

    return NextResponse.json({
      message: "Timetable generated successfully",
      stats: result.stats,
      conflicts: result.conflicts,
    });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/admin/timetable/generate" });
  }
});
