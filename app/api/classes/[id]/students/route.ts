import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { enrollmentService } from "@/features/enrollments/enrollment.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/classes/[id]/students
 * Get students enrolled in a class for a specific academic year
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const { searchParams } = new URL(request.url);
      const academicYearId = searchParams.get("academicYearId");

      if (!academicYearId) {
        return ApiResponse.badRequest("Missing required parameter: academicYearId");
      }

      const enrollments = await enrollmentService.getStudentsByClass(id, academicYearId, context);

      return ApiResponse.success(enrollments);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/classes/${(await params).id}/students`,
      });
    }
  }
);
