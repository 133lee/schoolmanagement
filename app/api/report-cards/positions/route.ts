import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { reportCardService } from "@/features/report-cards/reportCard.service";
import { Role } from "@/types/prisma-enums";
import { AuthContext } from "@/lib/auth/authorization";

/**
 * POST /api/report-cards/positions
 * Calculate class positions for all report cards in a term
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };

    const body = await request.json();
    const { classId, termId } = body;

    if (!classId || !termId) {
      return ApiResponse.badRequest("Missing required fields");
    }

    const result = await reportCardService.calculateClassPositions(classId, termId, context);

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "POST /api/report-cards/positions" });
  }
});
