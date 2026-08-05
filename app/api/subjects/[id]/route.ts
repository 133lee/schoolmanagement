import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { subjectService } from "@/features/subjects/subject.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/subjects/[id]
 * Get a single subject by ID
 */
export const GET = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Subject ID is required");
      }

      const { searchParams } = new URL(request.url);
      const includeRelations = searchParams.get("include") === "relations";

      const subject = includeRelations
        ? await subjectService.getSubjectByIdWithRelations(id, context)
        : await subjectService.getSubjectById(id, context);

      if (!subject) {
        return ApiResponse.notFound("Subject not found");
      }

      return ApiResponse.success(subject);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `GET /api/subjects/${(await params).id}`,
      });
    }
  }
);

/**
 * PATCH /api/subjects/[id]
 * Update a subject's information
 */
export const PATCH = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Subject ID is required");
      }

      const body = await request.json();
      const subject = await subjectService.updateSubject(id, body, context);

      return ApiResponse.success(subject);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `PATCH /api/subjects/${(await params).id}`,
      });
    }
  }
);

/**
 * DELETE /api/subjects/[id]
 * Delete a subject (hard delete - ADMIN only)
 */
export const DELETE = withAuth(
  async (request: NextRequest, user, { params }) => {
    try {
      const { id } = await params;
      const context: AuthContext = { userId: user.userId, role: user.role as Role };

      if (!id) {
        return ApiResponse.badRequest("Subject ID is required");
      }

      const subject = await subjectService.deleteSubject(id, context);

      return ApiResponse.success(subject);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: `DELETE /api/subjects/${(await params).id}`,
      });
    }
  }
);
