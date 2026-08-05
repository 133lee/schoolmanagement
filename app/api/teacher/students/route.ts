import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherStudentService } from "@/features/teachers/teacher-student.service";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/teacher/students
 *
 * Get students for the logged-in teacher based on their role:
 * - As class teacher: Get all students in the class they manage
 * - As subject teacher: Get students grouped by each class they teach
 *
 * Query params:
 * - view: "class-teacher" | "subject-teacher" (default: "class-teacher")
 * - classId: Filter by specific class (for subject teacher view)
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const view = (searchParams.get("view") as "class-teacher" | "subject-teacher") || "class-teacher";
    const classId = searchParams.get("classId");

    logger.logRequest("GET", "/api/teacher/students", user.userId, { view, classId });

    const students = await teacherStudentService.getStudentsForTeacher(
      user.userId,
      view,
      classId
    );

    return ApiResponse.success(students);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/teacher/students",
    });
  }
});
