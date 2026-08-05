import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { hodService } from "@/features/hod/hod.service";

/**
 * GET /api/hod/performance
 * Department performance overview for the logged-in HOD
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId") || undefined;
    const termId = searchParams.get("termId") || undefined;
    const academicYearId = searchParams.get("academicYearId") || undefined;

    const result = await hodService.getPerformanceOverview(user.userId, {
      subjectId,
      termId,
      academicYearId,
    });

    return ApiResponse.success(result);
  } catch (error) {
    return handleApiError(error, { userId: user.userId, endpoint: "GET /api/hod/performance" });
  }
});
