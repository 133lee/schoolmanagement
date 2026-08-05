import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { UnauthorizedError } from "@/lib/errors";
import { Role } from "@/types/prisma-enums";
import { smsService } from "@/features/sms/sms.service";

/** GET /api/sms/templates — all active templates (teacher+) */
export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      const templates = await smsService.getTemplates({ userId: user.userId, role: user.role as Role });
      return ApiResponse.success(templates);
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "GET /api/sms/templates" });
    }
  })(request, {} as any);
}

/** POST /api/sms/templates — create template (admin only) */
export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      if (user.role !== Role.ADMIN) throw new UnauthorizedError("Admin only");
      const body = await request.json();
      const template = await smsService.createTemplate(body, { userId: user.userId, role: user.role });
      return ApiResponse.success(template);
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "POST /api/sms/templates" });
    }
  })(request, {} as any);
}
