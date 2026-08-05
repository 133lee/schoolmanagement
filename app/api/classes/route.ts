import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { classService } from "@/features/classes/class.service";
import { ClassStatus, Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/classes
 * - Default: paginated classes (management tables)
 * - mode=all: all classes (dropdowns, selectors, configs)
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode"); // "all" or null

    const filters: { status?: ClassStatus; gradeId?: string; search?: string } = {};
    const status = searchParams.get("status");
    const gradeId = searchParams.get("gradeId");
    const search = searchParams.get("search");

    if (status) filters.status = status as ClassStatus;
    if (gradeId) filters.gradeId = gradeId;
    if (search) filters.search = search;

    /* ================= NON-PAGINATED MODE ================= */
    if (mode === "all") {
      const classes = await classService.getAllClasses(
        Object.keys(filters).length > 0 ? filters : undefined,
        context
      );

      return ApiResponse.success(classes);
    }

    /* ================= PAGINATED MODE (DEFAULT) ================= */
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const result = await classService.getClasses(
      Object.keys(filters).length > 0 ? filters : undefined,
      { page, pageSize },
      context
    );

    return ApiResponse.success(result.data, result.meta);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/classes" });
  }
});

/**
 * POST /api/classes
 * Create a new class
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const classEntity = await classService.createClass(body, context);

    return ApiResponse.created(classEntity);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/classes" });
  }
});
