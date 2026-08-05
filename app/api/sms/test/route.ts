import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { SmsGatewayService } from "@/features/sms/smsGateway.service";
import { AfricasTalkingService } from "@/features/sms/africasTalking.service";
import { loadSmsConfig } from "@/lib/sms/sms-config";
import { logger } from "@/lib/logger/logger";

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      logger.logRequest("GET", "/api/sms/test", user.userId);

      const provider = (req.nextUrl.searchParams.get("provider") ?? "AFRICAS_TALKING") as
        | "SMS_GATEWAY"
        | "AFRICAS_TALKING";

      const config = await loadSmsConfig();

      let result: { success: boolean; message: string };

      if (provider === "SMS_GATEWAY") {
        const service = new SmsGatewayService(config.smsgateway);
        result = await service.testConnection();
      } else {
        const service = new AfricasTalkingService(config.africastalking);
        result = await service.testConnection();
      }

      return ApiResponse.success(result);
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "/api/sms/test" });
    }
  })(request, {} as any);
}
