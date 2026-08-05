import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { teacherService } from "@/features/teachers/teacher.service";

/**
 * GET /api/user/teaching-context
 * Whether the logged-in user currently has a teaching assignment
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const result = await teacherService.getTeachingContext(user.userId);
    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/user/teaching-context" });
  }
});
