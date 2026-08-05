import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { smsService } from "@/features/sms/sms.service";
import { logger } from "@/lib/logger/logger";
import { Role } from "@/types/prisma-enums";

/**
 * POST /api/sms/send
 *
 * Send SMS to a single guardian
 *
 * Request body:
 * {
 *   "guardianId": string,
 *   "studentId"?: string,
 *   "message": string,
 *   "provider"?: "AFRICAS_TALKING" | "TWILIO" | "CLICKSEND"
 * }
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      const body = await request.json();

      logger.logRequest("POST", "/api/sms/send", user.userId, {
        guardianId: body.guardianId,
        studentId: body.studentId,
        messageLength: body.message?.length,
      });

      const result = await smsService.sendSMS(
        {
          guardianId: body.guardianId,
          studentId: body.studentId,
          message: body.message,
          provider: body.provider,
        },
        {
          userId: user.userId,
          role: user.role as Role,
        }
      );

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, {
        userId: user.userId,
        endpoint: "/api/sms/send",
      });
    }
  })(request, {} as any);
}
