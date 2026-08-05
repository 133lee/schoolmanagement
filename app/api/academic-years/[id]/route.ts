import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { academicYearService } from "@/features/academic-years/academicYear.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/academic-years/[id]
 * Get academic year by ID
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const academicYear = await academicYearService.getAcademicYearById(id, context);

      return ApiResponse.success(academicYear);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/academic-years/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/academic-years/[id]
 * Update academic year
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const body = await request.json();
      const { year, startDate, endDate } = body;

      const academicYear = await academicYearService.updateAcademicYear(
        id,
        {
          ...(year && { year: parseInt(year) }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
        },
        context
      );

      return ApiResponse.success(academicYear);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/academic-years/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/academic-years/[id]
 * Delete academic year
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      await academicYearService.deleteAcademicYear(id, context);

      return ApiResponse.noContent();
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/academic-years/${(await params).id}`,
      });
    }
  }
);
