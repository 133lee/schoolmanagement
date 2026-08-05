import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { classService } from "@/features/classes/class.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/classes/import
 * Bulk import classes from CSV data.
 * Body: { rows: Array<{ name, gradeName, capacity? }> }
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    if (!body.rows || !Array.isArray(body.rows)) {
      return ApiResponse.badRequest("Invalid request body. Expected { rows: [...] }");
    }

    const result = await classService.bulkImportClasses(body.rows, context);

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/classes/import" });
  }
});
