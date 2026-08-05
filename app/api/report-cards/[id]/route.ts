import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { reportCardService } from "@/features/report-cards/reportCard.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/report-cards/[id]
 * Get report card by ID with all relations
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const reportCard = await reportCardService.getReportCardWithRelations(id, context);

      return ApiResponse.success(reportCard);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/report-cards/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/report-cards/[id]
 * Update report card remarks and promotion status
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const body = await request.json();
      const { classTeacherRemarks, headTeacherRemarks, promotionStatus, nextGrade } = body;

      const reportCard = await reportCardService.updateReportCard(
        id,
        { classTeacherRemarks, headTeacherRemarks, promotionStatus, nextGrade },
        context
      );

      return ApiResponse.success(reportCard);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/report-cards/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/report-cards/[id]
 * Delete report card (admin only)
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      await reportCardService.deleteReportCard(id, context);

      // Note: must return a real JSON body (not 204/no-content) — the live
      // useReportCards().deleteReportCard() consumer awaits apiRequest(), which
      // calls response.json() unconditionally; an empty body would throw there
      // and surface as a false "delete failed" error despite success.
      return ApiResponse.success({ message: "Report card deleted successfully" });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/report-cards/${(await params).id}`,
      });
    }
  }
);
