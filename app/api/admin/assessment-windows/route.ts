import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { UnauthorizedError } from "@/lib/errors";
import { Role } from "@/types/prisma-enums";
import { hasRoleAuthority } from "@/lib/auth/role-hierarchy";
import { assessmentWindowService } from "@/features/assessment-windows/assessmentWindow.service";

/** GET /api/admin/assessment-windows — list all windows, optionally ?termId= */
export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      if (!hasRoleAuthority(user.role as Role, Role.HEAD_TEACHER))
        throw new UnauthorizedError();

      const termId = req.nextUrl.searchParams.get("termId") ?? undefined;

      const windows = await assessmentWindowService.getAll(termId);

      return ApiResponse.success(windows);
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "GET /api/admin/assessment-windows" });
    }
  })(request, {} as any);
}

/** POST /api/admin/assessment-windows — upsert (create or replace) a window */
export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      if (!hasRoleAuthority(user.role as Role, Role.HEAD_TEACHER))
        throw new UnauthorizedError();

      const body = await request.json();
      const { termId, examType, opensAt, closesAt } = body as {
        termId: string;
        examType: string;
        opensAt: string;
        closesAt: string;
      };

      const window = await assessmentWindowService.upsert({
        termId,
        examType,
        opensAt,
        closesAt,
        createdBy: user.userId,
      });

      return ApiResponse.success(window);
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "POST /api/admin/assessment-windows" });
    }
  })(request, {} as any);
}
