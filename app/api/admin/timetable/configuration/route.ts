import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { handleApiError } from "@/lib/http/error-handler";
import { ApiResponse } from "@/lib/http/api-response";
import { timetableService } from "@/features/timetables/timetable.service";
import { academicYearService } from "@/features/academic-years/academicYear.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/admin/timetable/configuration
 * Get timetable configuration for the active academic year
 *
 * Note: intentionally returns { configuration, academicYear } at the top
 * level (not the standard envelope) — the configuration page reads this
 * shape directly and non-defensively.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const academicYear = await academicYearService.getActiveAcademicYear(context);
    if (!academicYear) {
      return ApiResponse.notFound("No active academic year found");
    }

    const configuration = await timetableService.getConfiguration(academicYear.id, context);

    return NextResponse.json({
      configuration: configuration ?? null,
      academicYear: { id: academicYear.id, year: academicYear.year },
    });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "GET /api/admin/timetable/configuration",
    });
  }
});

/**
 * POST /api/admin/timetable/configuration
 * Create or update timetable configuration
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const body = await request.json();

    const configuration = await timetableService.createOrUpdateConfiguration(body, context);

    return NextResponse.json({ configuration });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "POST /api/admin/timetable/configuration",
    });
  }
});
