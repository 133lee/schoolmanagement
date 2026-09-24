import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { UnauthorizedError } from "@/lib/errors";
import { Role } from "@/types/prisma-enums";
import { hasRoleAuthority } from "@/lib/auth/role-hierarchy";
import { assessmentWindowService } from "@/features/assessment-windows/assessmentWindow.service";

/**
 * GET /api/assessment-windows?termId=&examType=
 *
 * Returns the configured window for a term+examType and the current state:
 *   state: "before_open" | "open" | "closed" | "not_configured"
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      if (!hasRoleAuthority(user.role as Role, Role.TEACHER)) throw new UnauthorizedError();

      const termId = req.nextUrl.searchParams.get("termId") ?? "";
      const examType = req.nextUrl.searchParams.get("examType") ?? "";

      const result = await assessmentWindowService.getWindowState(termId, examType);

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "GET /api/assessment-windows" });
    }
  })(request);
}
