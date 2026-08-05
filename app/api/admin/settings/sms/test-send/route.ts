import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { Role } from "@/types/prisma-enums";
import { SmsGatewayService } from "@/features/sms/smsGateway.service";
import { AfricasTalkingService } from "@/features/sms/africasTalking.service";
import { loadSmsConfig } from "@/lib/sms/sms-config";

/**
 * POST /api/admin/settings/sms/test-send
 * Send a test SMS to any raw phone number (admin only, not logged to SMS log).
 */
export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      if (user.role !== Role.ADMIN) throw new UnauthorizedError("Admin only");

      const body = await request.json();
      const { phone, message, provider } = body as {
        phone: string;
        message?: string;
        provider: "SMS_GATEWAY" | "AFRICAS_TALKING";
      };

      if (!phone?.trim()) throw new ValidationError("Phone number is required");
      if (!provider) throw new ValidationError("Provider is required");

      const config = await loadSmsConfig();
      const text = message?.trim() || `Test SMS from School Management System — ${new Date().toLocaleTimeString()}`;

      let result;
      if (provider === "SMS_GATEWAY") {
        result = await new SmsGatewayService(config.smsgateway).sendSMS(phone.trim(), text);
      } else {
        result = await new AfricasTalkingService(config.africastalking).sendSMS(phone.trim(), text);
      }

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "POST /api/admin/settings/sms/test-send" });
    }
  })(request, {} as any);
}
