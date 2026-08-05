import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { studentService } from "@/features/students/student.service";
import { Gender, StudentStatus, VulnerabilityStatus, Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * GET /api/students
 * - Default: paginated students (management tables)
 * - mode=all: all students (dropdowns, selectors, configs)
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode"); // "all" or null

    const filters: {
      status?: StudentStatus;
      gender?: Gender;
      search?: string;
      vulnerability?: VulnerabilityStatus;
    } = {};
    const status = searchParams.get("status");
    const gender = searchParams.get("gender");
    const search = searchParams.get("search");
    const vulnerability = searchParams.get("vulnerability");
    const academicYearId = searchParams.get("academicYearId");
    const filterUnenrolled = searchParams.get("filterUnenrolled") === "true";
    const filterEnrolled = searchParams.get("filterEnrolled") === "true";

    if (status) filters.status = status as StudentStatus;
    if (gender) filters.gender = gender as Gender;
    if (search) filters.search = search;
    if (vulnerability) filters.vulnerability = vulnerability as VulnerabilityStatus;

    /* ================= NON-PAGINATED MODE ================= */
    if (mode === "all") {
      const students = await studentService.getAllStudents(
        Object.keys(filters).length > 0 ? filters : undefined,
        context,
        academicYearId || undefined,
        filterUnenrolled,
        filterEnrolled
      );

      return ApiResponse.success(students);
    }

    /* ================= PAGINATED MODE (DEFAULT) ================= */
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const result = await studentService.getStudents(
      Object.keys(filters).length > 0 ? filters : undefined,
      { page, pageSize },
      context,
      academicYearId || undefined,
      filterUnenrolled,
      filterEnrolled
    );

    return ApiResponse.success(result.data, result.meta);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/students" });
  }
});

/**
 * POST /api/students
 * Create a new student
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const input = {
      ...body,
      dateOfBirth: new Date(body.dateOfBirth),
      admissionDate: new Date(body.admissionDate),
    };

    const student = await studentService.createStudent(input, context);

    return ApiResponse.created(student);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/students" });
  }
});
