import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { gradePerformanceReportService } from "@/features/admin/grade-performance-report.service";
import { logger } from "@/lib/logger/logger";
import { Role } from "@/types/prisma-enums";

/**
 * GET /api/admin/reports/grade-performance
 *
 * Grade-wide "Subject by Gender Analysis" + "Overall Performance" report,
 * aggregated from final report card data across every stream of a grade
 * for a term. Consumed by the admin Reports page's PDF export.
 *
 * Query params:
 * - gradeId: The grade ID (required)
 * - termId: The term ID (required)
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gradeId = searchParams.get("gradeId");
    const termId = searchParams.get("termId");

    if (!gradeId || !termId) {
      return ApiResponse.error("Grade ID and Term ID are required", 400);
    }

    logger.logRequest("GET", "/api/admin/reports/grade-performance", user.userId, {
      gradeId,
      termId,
    });

    const report = await gradePerformanceReportService.getGradeReport(
      gradeId,
      termId,
      { userId: user.userId, role: user.role as Role }
    );

    return ApiResponse.success(report);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/admin/reports/grade-performance",
    });
  }
});
