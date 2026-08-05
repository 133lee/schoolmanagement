import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { studentService, BulkImportStudentRow } from "@/features/students/student.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

const MAX_IMPORT_ROWS = 500;

/**
 * POST /api/students/import
 * Bulk import students from CSV data
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();

    if (!body.rows || !Array.isArray(body.rows)) {
      return ApiResponse.badRequest("Invalid request body. Expected { rows: [...] }");
    }
    if (body.rows.length === 0) {
      return ApiResponse.badRequest("No data to import. CSV appears to be empty.");
    }
    if (body.rows.length > MAX_IMPORT_ROWS) {
      return ApiResponse.badRequest(
        `Too many rows. Maximum allowed is ${MAX_IMPORT_ROWS} students per import.`
      );
    }

    const rows: BulkImportStudentRow[] = body.rows;
    const result = await studentService.bulkImportStudents(rows, context);

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/students/import" });
  }
});
