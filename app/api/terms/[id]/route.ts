import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { termService } from "@/features/terms/term.service";
import { TermType, Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/terms/[id]
 * Get term by ID
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const term = await termService.getTermById(id, context);

      return ApiResponse.success(term);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/terms/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/terms/[id]
 * Update term
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const body = await request.json();
      const { termType, startDate, endDate } = body;

      const term = await termService.updateTerm(
        id,
        {
          ...(termType && { termType: termType as TermType }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
        },
        context
      );

      return ApiResponse.success(term);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/terms/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/terms/[id]
 * Delete term
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      await termService.deleteTerm(id, context);

      return ApiResponse.noContent();
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/terms/${(await params).id}`,
      });
    }
  }
);
