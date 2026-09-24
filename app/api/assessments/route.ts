import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { assessmentService } from "@/features/assessments/assessment.service";
import { ExamType, AssessmentStatus, Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/assessments
 * List assessments with filters and pagination
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const searchParams = request.nextUrl.searchParams;
    const subjectId = searchParams.get("subjectId") || undefined;
    const classId = searchParams.get("classId") || undefined;
    const termId = searchParams.get("termId") || undefined;
    const examType = (searchParams.get("examType") as ExamType) || undefined;
    const status = (searchParams.get("status") as AssessmentStatus) || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await assessmentService.listAssessments(
      { subjectId, classId, termId, examType, status },
      { page, pageSize },
      context
    );

    return ApiResponse.success(result.data, { ...result.pagination, statusCounts: result.statusCounts });
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/assessments" });
  }
});

/**
 * POST /api/assessments
 * Create a new assessment
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const {
      title,
      description,
      subjectId,
      classId,
      termId,
      examType,
      totalMarks,
      passMark,
      weight,
      assessmentDate,
    } = body;

    if (!title || !subjectId || !classId || !termId || !examType) {
      return ApiResponse.badRequest("Missing required fields");
    }

    const assessment = await assessmentService.createAssessment(
      {
        title,
        description,
        subjectId,
        classId,
        termId,
        examType,
        totalMarks,
        passMark,
        weight,
        assessmentDate: assessmentDate ? new Date(assessmentDate) : undefined,
      },
      context
    );

    return ApiResponse.created(assessment);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/assessments" });
  }
});
