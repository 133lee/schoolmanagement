import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { assessmentService } from "@/features/assessments/assessment.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/assessments/[id]/publish
 * Publish assessment (make it available for grading)
 */
export const POST = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const assessment = await assessmentService.publishAssessment(id, context);

      return ApiResponse.success(assessment);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `POST /api/assessments/${(await params).id}/publish`,
      });
    }
  }
);
