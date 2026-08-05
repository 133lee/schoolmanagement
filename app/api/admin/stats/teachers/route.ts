import { NextRequest } from "next/server";
import { withRole } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { adminDashboardService } from "@/features/dashboard/adminDashboard.service";

export const GET = withRole(["ADMIN", "HEAD_TEACHER", "CLERK"], async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId") || undefined;

    const stats = await adminDashboardService.getTeacherStats(departmentId);

    return ApiResponse.success(stats);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/admin/stats/teachers" });
  }
});
