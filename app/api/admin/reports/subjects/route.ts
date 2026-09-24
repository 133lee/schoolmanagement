import { NextRequest } from "next/server";
import { withRole } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { reportService } from "@/features/reports/report.service";
import { logger } from "@/lib/logger/logger";
import { Role } from "@/types/prisma-enums";

/**
 * GET /api/admin/reports/subjects
 *
 * Get subjects for admin reports filtering. With a gradeId query param,
 * scoped to subjects actually offered in that grade (some subjects are
 * only taught in one stream of a grade, not every class); without it,
 * every subject in the school.
 */
export const GET = withRole(["ADMIN", "HEAD_TEACHER"], async (request: NextRequest, user) => {
  try {
    const gradeId = request.nextUrl.searchParams.get("gradeId");

    logger.logRequest("GET", "/api/admin/reports/subjects", user.userId, { gradeId });

    const subjects = gradeId
      ? await reportService.getSubjectsByGrade(gradeId, { userId: user.userId, role: user.role as Role })
      : await reportService.getAllSubjects();

    return ApiResponse.success({ subjects });
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/admin/reports/subjects",
    });
  }
});
