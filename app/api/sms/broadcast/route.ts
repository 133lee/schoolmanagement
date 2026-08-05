import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { UnauthorizedError } from "@/lib/errors";
import { Role } from "@/types/prisma-enums";
import { hasRoleAuthority } from "@/lib/auth/role-hierarchy";
import { smsBroadcastService } from "@/features/sms/smsBroadcast.service";

/**
 * POST /api/sms/broadcast
 *
 * Body:
 *  message      string               — message text with optional {variable} placeholders
 *  provider     SMS_GATEWAY | AFRICAS_TALKING
 *  recipientType ALL | GRADE | CLASS | INDIVIDUAL
 *  classId?     string
 *  gradeId?     string
 *  guardianIds? string[]
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      if (!hasRoleAuthority(user.role as Role, Role.TEACHER)) throw new UnauthorizedError();

      const body = await request.json();
      const { message, provider, recipientType, classId, gradeId, guardianIds = [] } = body as {
        message: string;
        provider: "SMS_GATEWAY" | "AFRICAS_TALKING";
        recipientType: "ALL" | "GRADE" | "CLASS" | "INDIVIDUAL";
        classId?: string;
        gradeId?: string;
        guardianIds?: string[];
      };

      const result = await smsBroadcastService.sendBroadcast(
        { message, provider, recipientType, classId, gradeId, guardianIds },
        user.userId
      );

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "POST /api/sms/broadcast" });
    }
  })(request, {} as never);
}
