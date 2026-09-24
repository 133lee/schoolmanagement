import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherStudentService } from "@/features/teachers/teacher-student.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/teacher/classes/[classId]/students
 *
 * Get students enrolled in a specific class.
 * Teacher must have access to the class (either as class teacher or subject teacher).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  return withAuth(async (req, user) => {
    try {
      const { classId } = await params;

      logger.logRequest("GET", `/api/teacher/classes/${classId}/students`, user.userId, {
        classId,
      });

      const data = await teacherStudentService.getStudentsForClass(user.userId, classId);

      return ApiResponse.success(data);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `/api/teacher/classes/[classId]/students`,
      });
    }
  })(request);
}
