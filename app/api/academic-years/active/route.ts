import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { academicYearService } from "@/features/academic-years/academicYear.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/academic-years/active
 * Get the currently active academic year
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const academicYear = await academicYearService.getActiveAcademicYear(context);

    if (!academicYear) {
      return ApiResponse.notFound("No active academic year found");
    }

    return ApiResponse.success(academicYear);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/academic-years/active" });
  }
});
