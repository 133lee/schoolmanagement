import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { termService } from "@/features/terms/term.service";
import { TermType, Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/terms
 * List all terms with pagination and filters
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const academicYearId = searchParams.get("academicYearId") || undefined;
    const termType = (searchParams.get("termType") as TermType | null) || undefined;
    const isActive = searchParams.get("isActive");

    const result = await termService.listTerms(
      {
        academicYearId,
        termType,
        isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      },
      { page, pageSize },
      context
    );

    return ApiResponse.success(result.data, result.pagination);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/terms" });
  }
});

/**
 * POST /api/terms
 * Create a new term
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const { academicYearId, termType, startDate, endDate } = body;

    if (!academicYearId || !termType || !startDate || !endDate) {
      return ApiResponse.badRequest(
        "Missing required fields: academicYearId, termType, startDate, endDate"
      );
    }

    const term = await termService.createTerm(
      {
        academicYearId,
        termType: termType as TermType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      context
    );

    return ApiResponse.created(term);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/terms" });
  }
});
