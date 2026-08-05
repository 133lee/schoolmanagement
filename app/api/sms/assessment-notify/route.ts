import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { UnauthorizedError } from "@/lib/errors";
import { Role } from "@/types/prisma-enums";
import { hasRoleAuthority } from "@/lib/auth/role-hierarchy";
import { assessmentNotifyService } from "@/features/sms/assessmentNotify.service";

/**
 * POST /api/sms/assessment-notify
 *
 * Sends per-student score SMS to primary guardian for a specific assessment type
 * within a class/term. One SMS per student (summary of all subjects for that exam type).
 *
 * Body:
 *  classId      string
 *  termId       string
 *  examType     CAT | MID | EOT
 *  provider     SMS_GATEWAY | AFRICAS_TALKING
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      if (!hasRoleAuthority(user.role as Role, Role.TEACHER)) throw new UnauthorizedError();

      const body = await request.json();
      const { classId, termId, examType, provider, excludeStudentIds = [] } = body as {
        classId: string;
        termId: string;
        examType: "CAT" | "MID" | "EOT";
        provider: "SMS_GATEWAY" | "AFRICAS_TALKING";
        excludeStudentIds?: string[];
      };

      const result = await assessmentNotifyService.notify(
        { classId, termId, examType, provider, excludeStudentIds },
        user.userId
      );

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "POST /api/sms/assessment-notify" });
    }
  })(request, {} as never);
}

/**
 * GET /api/sms/assessment-notify
 * ?classId, termId, examType required
 * ?detail=true  → also returns per-student list { id, firstName, lastName, hasPhone }
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      if (!hasRoleAuthority(user.role as Role, Role.TEACHER)) throw new UnauthorizedError();

      const sp = req.nextUrl.searchParams;
      const classId = sp.get("classId") ?? "";
      const termId = sp.get("termId") ?? "";
      const examType = sp.get("examType") ?? "";
      const detail = sp.get("detail") === "true";

      const preview = await assessmentNotifyService.getPreview(classId, termId, examType, detail);

      return ApiResponse.success(preview);
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "GET /api/sms/assessment-notify" });
    }
  })(request, {} as never);
}
