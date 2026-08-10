import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { assessmentService } from "@/features/assessments/assessment.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/assessments/[id]/results
 * Get all results for an assessment
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const results = await assessmentService.getAssessmentResults(id, context);

      return ApiResponse.success(results);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/assessments/${(await params).id}/results`,
      });
    }
  }
);

/**
 * POST /api/assessments/[id]/results
 * Enter or update results (single or bulk)
 */
export const POST = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const body = await request.json();

      if (Array.isArray(body)) {
        const result = await assessmentService.bulkEnterResults(id, body, context);

        return ApiResponse.created(result);
      }

      const { studentId, marksObtained, remarks, isAbsent } = body;

      if (!studentId || marksObtained === undefined) {
        return ApiResponse.badRequest("Missing required fields");
      }

      const result = await assessmentService.enterResult(
        id,
        { studentId, marksObtained, remarks, isAbsent },
        context
      );

      return ApiResponse.created(result);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `POST /api/assessments/${(await params).id}/results`,
      });
    }
  }
);
