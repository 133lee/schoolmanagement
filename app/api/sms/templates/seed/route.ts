import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { UnauthorizedError } from "@/lib/errors";
import { Role } from "@/types/prisma-enums";
import { smsService } from "@/features/sms/sms.service";

/** POST /api/sms/templates/seed — seed default templates (admin only) */
export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      if (user.role !== Role.ADMIN) throw new UnauthorizedError("Admin only");
      await smsService.seedDefaultTemplates({ userId: user.userId, role: user.role });
      return ApiResponse.success({ message: "Default templates seeded" });
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "POST /api/sms/templates/seed" });
    }
  })(request, {} as any);
}
