import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { studentService } from "@/features/students/student.service";
import { StudentStatus, Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * PATCH /api/students/[id]/status
 * Change a student's status
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Student ID is required");
      }

      const body = await request.json();
      const { status } = body;

      if (!status || !Object.values(StudentStatus).includes(status)) {
        return ApiResponse.badRequest("Valid status is required");
      }

      const student = await studentService.changeStudentStatus(id, status as StudentStatus, context);

      return ApiResponse.success(student);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/students/${(await params).id}/status`,
      });
    }
  }
);
