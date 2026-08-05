import { NextRequest } from "next/server";
import { withRole } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { adminDashboardService } from "@/features/dashboard/adminDashboard.service";

export const GET = withRole(["ADMIN", "HEAD_TEACHER", "CLERK"], async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // YYYY-MM-DD

    const stats = await adminDashboardService.getDailyAttendanceStats(dateParam);

    return ApiResponse.success(stats);
  } catch (error) {
    return handleApiError(error, {
      userId: user.userId,
      endpoint: "/api/admin/dashboard/attendance",
    });
  }
});
