import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherService } from "@/features/teachers/teacher.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * Sanitize string input to prevent XSS
 */
function sanitizeString(input: string | undefined): string | undefined {
  if (!input) return input;
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

/**
 * GET /api/teachers/[id]
 * Get a single teacher by ID
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Teacher ID is required");
      }

      const { searchParams } = new URL(request.url);
      const includeRelations = searchParams.get("include") === "relations";

      const teacher = includeRelations
        ? await teacherService.getTeacherByIdWithRelations(id, context)
        : await teacherService.getTeacherById(id, context);

      if (!teacher) {
        return ApiResponse.notFound("Teacher not found");
      }

      return ApiResponse.success(teacher);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/teachers/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/teachers/[id]
 * Update a teacher's information
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Teacher ID is required");
      }

      const body = await request.json();

      // Sanitize and prepare input
      const input: Record<string, unknown> = {};
      if (body.firstName) input.firstName = sanitizeString(body.firstName);
      if (body.middleName) input.middleName = sanitizeString(body.middleName);
      if (body.lastName) input.lastName = sanitizeString(body.lastName);
      if (body.dateOfBirth) input.dateOfBirth = new Date(body.dateOfBirth);
      if (body.gender) input.gender = body.gender;
      if (body.phone) input.phone = sanitizeString(body.phone);
      if (body.address) input.address = sanitizeString(body.address);
      if (body.qualification) input.qualification = body.qualification;
      if (body.yearsExperience !== undefined) input.yearsExperience = body.yearsExperience;
      if (body.departmentId) input.departmentId = body.departmentId;
      if (body.primarySubjectId) input.primarySubjectId = body.primarySubjectId;
      if (body.secondarySubjectId) input.secondarySubjectId = body.secondarySubjectId;

      const teacher = await teacherService.updateTeacher(id, input, context);

      return ApiResponse.success(teacher);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/teachers/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/teachers/[id]
 * Delete a teacher (hard delete - ADMIN only)
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Teacher ID is required");
      }

      const teacher = await teacherService.deleteTeacher(id, context);

      return ApiResponse.success(teacher);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/teachers/${(await params).id}`,
      });
    }
  }
);
