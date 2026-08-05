import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { enrollmentService } from "@/features/enrollments/enrollment.service";
import { AuthContext } from "@/lib/auth/authorization";
import { EnrollmentStatus, Role } from "@/types/prisma-enums";

/**
 * GET /api/enrollments
 * List enrollments with filters
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const classId = searchParams.get("classId") || undefined;
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const status = (searchParams.get("status") as EnrollmentStatus | null) || undefined;
    const studentId = searchParams.get("studentId") || undefined;

    const result = await enrollmentService.listEnrollments(
      { classId, academicYearId, status, studentId },
      { page, pageSize },
      context
    );

    return ApiResponse.success(result.data, result.pagination);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/enrollments" });
  }
});

/**
 * POST /api/enrollments
 * Create a new enrollment
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const { studentId, classId, academicYearId, enrollmentDate } = body;

    if (!studentId || !classId || !academicYearId) {
      return ApiResponse.badRequest(
        "Missing required fields: studentId, classId, academicYearId"
      );
    }

    const enrollment = await enrollmentService.createEnrollment(
      {
        studentId,
        classId,
        academicYearId,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
      },
      context
    );

    return ApiResponse.created(enrollment);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/enrollments" });
  }
});
