import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherService } from "@/features/teachers/teacher.service";
import { Gender, StaffStatus, QualificationLevel, Role } from "@/types/prisma-enums";
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
 * GET /api/teachers
 * - Default: paginated teachers (management tables)
 * - mode=all: all teachers (dropdowns, selectors, configs)
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode"); // "all" or null

    const filters: {
      status?: StaffStatus;
      gender?: Gender;
      qualification?: QualificationLevel;
      search?: string;
    } = {};
    const status = searchParams.get("status");
    const gender = searchParams.get("gender");
    const qualification = searchParams.get("qualification");
    const search = searchParams.get("search");

    if (status) filters.status = status as StaffStatus;
    if (gender) filters.gender = gender as Gender;
    if (qualification) filters.qualification = qualification as QualificationLevel;
    if (search) filters.search = search;

    /* ================= NON-PAGINATED MODE ================= */
    if (mode === "all") {
      const teachers = await teacherService.getAllTeachers(
        Object.keys(filters).length > 0 ? filters : undefined,
        context
      );

      return ApiResponse.success(teachers);
    }

    /* ================= PAGINATED MODE (DEFAULT) ================= */
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const result = await teacherService.getTeachers(
      Object.keys(filters).length > 0 ? filters : undefined,
      { page, pageSize },
      context
    );

    return ApiResponse.success(result.data, result.meta);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/teachers" });
  }
});

/**
 * POST /api/teachers
 * Create a new teacher
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();

    // Sanitize string inputs to prevent XSS
    const input = {
      email: sanitizeString(body.email),
      staffNumber: sanitizeString(body.staffNumber),
      firstName: sanitizeString(body.firstName),
      middleName: sanitizeString(body.middleName),
      lastName: sanitizeString(body.lastName),
      dateOfBirth: new Date(body.dateOfBirth),
      gender: body.gender,
      phone: sanitizeString(body.phone),
      address: sanitizeString(body.address),
      qualification: body.qualification,
      yearsExperience: body.yearsExperience,
      status: body.status,
      hireDate: new Date(body.hireDate),
      primarySubjectId: body.primarySubjectId,
      secondarySubjectId: body.secondarySubjectId,
      permissibleSubjectIds: Array.isArray(body.permissibleSubjectIds)
        ? body.permissibleSubjectIds
        : undefined,
    };

    const teacher = await teacherService.createTeacher(
      input as Parameters<typeof teacherService.createTeacher>[0],
      context
    );

    return ApiResponse.created(teacher);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/teachers" });
  }
});
