import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherPerformanceService } from "@/features/teachers/teacherPerformance.service";

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const classId = searchParams.get("classId");
    const termId = searchParams.get("termId");

    if (!subjectId || !termId) {
      return ApiResponse.badRequest("Missing required parameters: subjectId, termId");
    }

    const result = await teacherPerformanceService.getSubjectPerformance(
      user.userId,
      subjectId,
      termId,
      classId
    );

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/teacher/subject-performance" });
  }
});
