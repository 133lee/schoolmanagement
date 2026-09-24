import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { enrollmentService } from "@/features/enrollments/enrollment.service";
import { AuthContext } from "@/lib/auth/authorization";
import { Role } from "@/types/prisma-enums";

/**
 * POST /api/enrollments/[id]/withdraw
 * Withdraw a student from a class — marks the enrollment WITHDRAWN and the
 * student's own status WITHDRAWN (soft delete; preserves enrollment history,
 * unlike DELETE /api/enrollments/[id] which hard-deletes the row).
 */
export const POST = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const body = await request.json().catch(() => ({}));
      const reason: string | undefined = body?.reason;

      const enrollment = await enrollmentService.withdrawStudentFromClass(id, reason, context);

      return ApiResponse.success(enrollment, { message: "Student withdrawn successfully" });
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `POST /api/enrollments/${(await params).id}/withdraw`,
      });
    }
  }
);
