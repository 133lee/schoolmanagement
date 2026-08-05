import { NextRequest } from "next/server";
import { withRole } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { gradeSeedService } from "@/features/grade-levels/gradeSeed.service";

export const POST = withRole(["ADMIN"], async (_request: NextRequest, user) => {
  try {
    const result = await gradeSeedService.seedDefaultGrades();
    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "POST /api/admin/settings/seed-grades",
    });
  }
});
