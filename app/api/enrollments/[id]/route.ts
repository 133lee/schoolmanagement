import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { ValidationError } from "@/lib/http/errors";
import { enrollmentService } from "@/features/enrollments/enrollment.service";
import { transferEnrollmentSchema } from "@/features/enrollments/enrollment.validation";
import { AuthContext } from "@/lib/auth/authorization";
import { Role } from "@/types/prisma-enums";

/**
 * GET /api/enrollments/[id]
 * Get enrollment by ID
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const enrollment = await enrollmentService.getEnrollmentById(id, context);

      return ApiResponse.success(enrollment);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/enrollments/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/enrollments/[id]
 * Transfer a student's enrollment to a different class
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      const body = await request.json();
      const parsed = transferEnrollmentSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError("Invalid transfer data", parsed.error.flatten().fieldErrors);
      }
      const { classId, changeReason } = parsed.data;

      const enrollment = await enrollmentService.updateEnrollment(
        id,
        { classId, notes: changeReason },
        context
      );

      return ApiResponse.success(enrollment);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/enrollments/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/enrollments/[id]
 * Delete enrollment
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      await enrollmentService.deleteEnrollment(id, context);

      return ApiResponse.noContent();
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/enrollments/${(await params).id}`,
      });
    }
  }
);
