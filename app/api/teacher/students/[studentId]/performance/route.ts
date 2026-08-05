import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherPerformanceService } from "@/features/teachers/teacherPerformance.service";
import { ExamType } from "@/types/prisma-enums";

export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { studentId } = await params;
      const { searchParams } = new URL(request.url);
      const assessmentType = searchParams.get("assessmentType") as ExamType;
      const termId = searchParams.get("termId");

      if (!assessmentType || !termId) {
        return ApiResponse.badRequest("Missing required parameters: assessmentType, termId");
      }

      const result = await teacherPerformanceService.getStudentPerformanceForTeacher(
        user.userId,
        studentId,
        assessmentType,
        termId
      );

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/teacher/students/${(await params).studentId}/performance`,
      });
    }
  }
);
