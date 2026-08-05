import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { UnauthorizedError } from "@/lib/errors";
import { Role } from "@/types/prisma-enums";
import { hasRoleAuthority } from "@/lib/auth/role-hierarchy";
import { smsBroadcastService } from "@/features/sms/smsBroadcast.service";

/**
 * GET /api/sms/broadcast/preview
 * Returns how many guardians will receive the broadcast and a short sample list.
 *
 * Query params:
 *   type   = ALL | GRADE | CLASS | INDIVIDUAL
 *   classId, gradeId, guardianIds (comma-separated) — context-dependent
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      if (!hasRoleAuthority(user.role as Role, Role.TEACHER)) throw new UnauthorizedError();

      const sp = req.nextUrl.searchParams;
      const type = sp.get("type") as "ALL" | "GRADE" | "CLASS" | "INDIVIDUAL";
      const classId = sp.get("classId") ?? undefined;
      const gradeId = sp.get("gradeId") ?? undefined;
      const guardianIds = sp.get("guardianIds")?.split(",").filter(Boolean) ?? [];

      const preview = await smsBroadcastService.previewBroadcast(type, { classId, gradeId, guardianIds });

      return ApiResponse.success(preview);
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "GET /api/sms/broadcast/preview" });
    }
  })(request, {} as never);
}
