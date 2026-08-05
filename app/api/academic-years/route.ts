import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { academicYearService } from "@/features/academic-years/academicYear.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/academic-years
 * List all academic years with pagination and filters
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const isActive = searchParams.get("isActive");
    const isClosed = searchParams.get("isClosed");
    const search = searchParams.get("search") || undefined;

    const result = await academicYearService.listAcademicYears(
      {
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
        isClosed: isClosed === "true" ? true : isClosed === "false" ? false : undefined,
        search,
      },
      { page, pageSize },
      context
    );

    return ApiResponse.success(result.data, result.pagination);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/academic-years" });
  }
});

/**
 * POST /api/academic-years
 * Create a new academic year
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const { year, startDate, endDate } = body;

    if (!year || !startDate || !endDate) {
      return ApiResponse.badRequest("Missing required fields: year, startDate, endDate");
    }

    const academicYear = await academicYearService.createAcademicYear(
      {
        year: parseInt(year),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      context
    );

    return ApiResponse.created(academicYear);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/academic-years" });
  }
});
