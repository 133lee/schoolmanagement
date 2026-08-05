import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { subjectService } from "@/features/subjects/subject.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/subjects/import
 * Bulk import subjects from CSV data.
 * Body: { rows: Array<{ name, code, description? }> }
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    if (!body.rows || !Array.isArray(body.rows)) {
      return ApiResponse.badRequest("Invalid request body. Expected { rows: [...] }");
    }

    const result = await subjectService.bulkImportSubjects(body.rows, context);

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/subjects/import" });
  }
});
