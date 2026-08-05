import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { studentAssessmentResultService } from "@/features/assessment-results/studentAssessmentResult.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/admin/fix-grades
 * Recalculate and fix incorrect grades for all assessment results (ADMIN only)
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const result = await studentAssessmentResultService.fixGrades(context);

    return ApiResponse.success(result, { message: "Grade fix completed" });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/admin/fix-grades" });
  }
});
