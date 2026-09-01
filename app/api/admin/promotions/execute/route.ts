import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { ValidationError } from "@/lib/http/errors";
import { studentPromotionService } from "@/features/promotions/studentPromotion.service";
import { executeBodySchema } from "@/features/promotions/promotion.validation";
import { AuthContext } from "@/lib/auth/authorization";
import { Role } from "@/types/prisma-enums";

/**
 * POST /api/admin/promotions/execute
 * Execute a batch of promotion decisions for a single source class —
 * creates next-year enrollments (PROMOTE/REPEAT) and StudentPromotion
 * audit records, or marks a student GRADUATED.
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const body = await request.json();

    const parsed = executeBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid promotion data", parsed.error.flatten().fieldErrors);
    }

    const result = await studentPromotionService.executePromotions(parsed.data, context);

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "POST /api/admin/promotions/execute",
    });
  }
});
