import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { hodService } from "@/features/hod/hod.service";

export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const result = await hodService.getDashboard(user.userId);
    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/hod/dashboard" });
  }
});
