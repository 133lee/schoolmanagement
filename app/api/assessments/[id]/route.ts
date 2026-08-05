import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { assessmentService } from "@/features/assessments/assessment.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/assessments/[id]
 * Get assessment by ID with relations
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const assessment = await assessmentService.getAssessmentWithRelations(id, context);

      return ApiResponse.success(assessment);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/assessments/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/assessments/[id]
 * Update assessment
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const body = await request.json();
      const { title, description, totalMarks, passMark, weight, assessmentDate, status } = body;

      const assessment = await assessmentService.updateAssessment(
        id,
        {
          title,
          description,
          totalMarks,
          passMark,
          weight,
          assessmentDate: assessmentDate ? new Date(assessmentDate) : undefined,
          status,
        },
        context
      );

      return ApiResponse.success(assessment);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/assessments/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/assessments/[id]
 * Delete assessment
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      await assessmentService.deleteAssessment(id, context);

      return ApiResponse.success({ message: "Assessment deleted successfully" });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/assessments/${(await params).id}`,
      });
    }
  }
);
