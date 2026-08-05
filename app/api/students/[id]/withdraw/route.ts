import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { studentService } from "@/features/students/student.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/students/[id]/withdraw
 * Withdraw a student (soft delete)
 */
export const POST = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Student ID is required");
      }

      const student = await studentService.withdrawStudent(id, context);

      return ApiResponse.success(student, { message: "Student withdrawn successfully" });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `POST /api/students/${(await params).id}/withdraw`,
      });
    }
  }
);
