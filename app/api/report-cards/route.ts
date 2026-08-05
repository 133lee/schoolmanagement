import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { reportCardService } from "@/features/report-cards/reportCard.service";
import { PromotionStatus, Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/report-cards
 * List report cards with filters and pagination
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const filters = {
      studentId: searchParams.get("studentId") || undefined,
      classId: searchParams.get("classId") || undefined,
      termId: searchParams.get("termId") || undefined,
      academicYearId: searchParams.get("academicYearId") || undefined,
      promotionStatus: (searchParams.get("promotionStatus") as PromotionStatus) || undefined,
    };

    const result = await reportCardService.listReportCards(filters, { page, pageSize }, context);

    return ApiResponse.success(result.data, result.pagination);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/report-cards" });
  }
});

/**
 * POST /api/report-cards
 * Generate a report card for a student
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const { studentId, classId, termId, classTeacherId } = body;

    if (!studentId || !classId || !termId || !classTeacherId) {
      return ApiResponse.badRequest("Missing required fields");
    }

    const reportCard = await reportCardService.generateReportCard(
      { studentId, classId, termId, classTeacherId },
      context
    );

    return ApiResponse.created(reportCard);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/report-cards" });
  }
});
