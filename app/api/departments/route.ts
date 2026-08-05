import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { departmentService } from "@/features/departments/department.service";
import { DepartmentStatus, Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/departments
 * List all departments with optional filters and pagination
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as DepartmentStatus | null;
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const filters: { status?: DepartmentStatus; search?: string } = {};
    if (status) filters.status = status;
    if (search) filters.search = search;

    const result = await departmentService.getDepartments(filters, { page, pageSize }, context);

    return ApiResponse.success(result.data, result.meta);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/departments" });
  }
});

/**
 * POST /api/departments
 * Create a new department
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const department = await departmentService.createDepartment(body, context);

    return ApiResponse.created(department);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/departments" });
  }
});
