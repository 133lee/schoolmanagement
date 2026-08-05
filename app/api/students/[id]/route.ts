import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { studentService } from "@/features/students/student.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/students/[id]
 * Get a single student by ID
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Student ID is required");
      }

      const { searchParams } = new URL(request.url);
      const includeRelations = searchParams.get("include") === "relations";

      const student = includeRelations
        ? await studentService.getStudentByIdWithRelations(id, context)
        : await studentService.getStudentById(id, context);

      if (!student) {
        return ApiResponse.notFound("Student not found");
      }

      return ApiResponse.success(student);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/students/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/students/[id]
 * Update a student's information
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
      const input: Record<string, unknown> = { ...body };
      if (body.dateOfBirth) {
        input.dateOfBirth = new Date(body.dateOfBirth);
      }

      const student = await studentService.updateStudent(id, input, context);

      return ApiResponse.success(student);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/students/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/students/[id]
 * Delete a student (hard delete - ADMIN only)
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Student ID is required");
      }

      const student = await studentService.deleteStudent(id, context);

      return ApiResponse.success(student);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/students/${(await params).id}`,
      });
    }
  }
);
