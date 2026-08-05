import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { enrollmentService } from "@/features/enrollments/enrollment.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/enrollments/bulk
 * Bulk enroll students
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const { studentIds, classId, academicYearId, enrollmentDate } = body;

    if (!studentIds || !Array.isArray(studentIds) || !classId || !academicYearId) {
      return ApiResponse.badRequest(
        "Missing required fields: studentIds (array), classId, academicYearId"
      );
    }

    const result = await enrollmentService.bulkEnroll(
      {
        studentIds,
        classId,
        academicYearId,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
      },
      context
    );

    return ApiResponse.created(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/enrollments/bulk" });
  }
});
