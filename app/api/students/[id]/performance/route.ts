import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { studentPerformanceService } from "@/features/students/studentPerformance.service";

/**
 * GET /api/students/[id]/performance
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id: studentId } = await params;
      const { searchParams } = new URL(request.url);

      const classId = searchParams.get("classId") || "";
      const academicYearId = searchParams.get("academicYearId") || "";

      const result = await studentPerformanceService.getStudentPerformance(
        studentId,
        classId,
        academicYearId
      );

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/students/${(await params).id}/performance`,
      });
    }
  }
);
