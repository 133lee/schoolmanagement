import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { ValidationError } from "@/lib/http/errors";
import { reportCardService } from "@/features/report-cards/reportCard.service";
import { bulkDeleteReportCardsSchema } from "@/features/report-cards/reportCard.validation";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/report-cards/bulk
 * Bulk generate report cards for an entire class
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const { classId, termId, classTeacherId } = body;

    if (!classId || !termId || !classTeacherId) {
      return ApiResponse.badRequest("Missing required fields");
    }

    const result = await reportCardService.bulkGenerateReportCards(
      classId,
      termId,
      classTeacherId,
      context
    );

    return ApiResponse.created(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/report-cards/bulk" });
  }
});

/**
 * DELETE /api/report-cards/bulk
 * Bulk delete report cards — either { ids: string[] } for explicit selection
 * or { filters: {...} } to delete everything matching a filter set.
 */
export const DELETE = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const parsed = bulkDeleteReportCardsSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid bulk delete request", parsed.error.flatten().fieldErrors);
    }

    const result = await reportCardService.bulkDeleteReportCards(parsed.data, context);

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "DELETE /api/report-cards/bulk" });
  }
});
