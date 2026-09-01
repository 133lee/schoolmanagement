import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { ValidationError } from "@/lib/http/errors";
import { studentPromotionService } from "@/features/promotions/studentPromotion.service";
import { evaluateQuerySchema } from "@/features/promotions/promotion.validation";
import { AuthContext } from "@/lib/auth/authorization";
import { Role } from "@/types/prisma-enums";

/**
 * GET /api/admin/promotions/evaluate?classId=&academicYearId=
 * Evaluate a class's actively-enrolled students against the Academic
 * Policy's promotion criteria. Read-only.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const context: AuthContext = { userId: user.userId, role: user.role as Role };
    const { searchParams } = new URL(request.url);

    const parsed = evaluateQuerySchema.safeParse({
      classId: searchParams.get("classId"),
      academicYearId: searchParams.get("academicYearId"),
    });
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", parsed.error.flatten().fieldErrors);
    }

    const result = await studentPromotionService.evaluateClassForPromotion(
      parsed.data.classId,
      parsed.data.academicYearId,
      context
    );

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "GET /api/admin/promotions/evaluate",
    });
  }
});
