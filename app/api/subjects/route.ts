import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { subjectService } from "@/features/subjects/subject.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/subjects
 * - Default: paginated subjects (management tables)
 * - mode=all: all subjects (curriculum, dropdowns, configs)
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode"); // "all" or null
    const departmentId = searchParams.get("departmentId");
    const search = searchParams.get("search");

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const filters: { departmentId?: string; search?: string } = {};
    if (departmentId) filters.departmentId = departmentId;
    if (search) filters.search = search;

    /* ================= NON-PAGINATED MODE ================= */
    if (mode === "all") {
      const subjects = await subjectService.getAllSubjects(filters, context);

      return ApiResponse.success(subjects);
    }

    /* ================= PAGINATED MODE (DEFAULT) ================= */
    const result = await subjectService.getSubjects(filters, { page, pageSize }, context);

    return ApiResponse.success(result.data, result.meta);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/subjects" });
  }
});

/**
 * POST /api/subjects
 * Create a new subject
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const subject = await subjectService.createSubject(body, context);

    return ApiResponse.created(subject);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/subjects" });
  }
});
