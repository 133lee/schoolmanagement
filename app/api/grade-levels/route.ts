import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { gradeService } from "@/features/grade-levels/grade.service";

/**
 * GET /api/grade-levels
 * Fetch grade levels. Automatically filters by school type from settings
 * unless an explicit ?schoolLevel=PRIMARY|SECONDARY|ALL override is provided.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const explicitLevel = request.nextUrl.searchParams.get("schoolLevel");

    const grades = await gradeService.getGradeLevels(explicitLevel);

    return ApiResponse.success(grades);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/grade-levels" });
  }
});
