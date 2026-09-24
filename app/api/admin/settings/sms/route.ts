import { NextRequest } from "next/server";
import { withAuth } from "@/lib/http/with-auth";
import { ApiResponse } from "@/lib/http/api-response";
import { handleApiError } from "@/lib/http/error-handler";
import { UnauthorizedError } from "@/lib/errors";
import { Role } from "@/types/prisma-enums";
import { loadSmsConfig, saveSmsConfig, maskKey } from "@/lib/sms/sms-config";
import { logger } from "@/lib/logger/logger";

/**
 * GET /api/admin/settings/sms
 * Returns current SMS config with masked API keys.
 */
export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      if (user.role !== Role.ADMIN) throw new UnauthorizedError("Admin only");

      const config = await loadSmsConfig();

      return ApiResponse.success({
        activeProvider: config.activeProvider,
        smsgateway: {
          username: config.smsgateway.username,
          deviceId: config.smsgateway.deviceId,
          passwordMasked: maskKey(config.smsgateway.password),
          configured: Boolean(config.smsgateway.username && config.smsgateway.password),
        },
        africastalking: {
          username: config.africastalking.username,
          senderId: config.africastalking.senderId,
          environment: config.africastalking.environment,
          apiKeyMasked: maskKey(config.africastalking.apiKey),
          configured: Boolean(config.africastalking.username && config.africastalking.apiKey),
        },
      });
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "GET /api/admin/settings/sms" });
    }
  })(request);
}

/**
 * PUT /api/admin/settings/sms
 * Saves SMS credentials to SystemSettings. Blank values are ignored (keeps existing).
 */
export async function PUT(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      if (user.role !== Role.ADMIN) throw new UnauthorizedError("Admin only");

      const body = await request.json();

      const partial: Parameters<typeof saveSmsConfig>[0] = {};

      if (body.activeProvider) partial.activeProvider = body.activeProvider;

      // SMS Gateway (Android, Cloud Mode)
      if (body.smsgateway_username?.trim()) partial.smsgateway_username = body.smsgateway_username.trim();
      if (body.smsgateway_password?.trim()) partial.smsgateway_password = body.smsgateway_password.trim();
      if (body.smsgateway_deviceId !== undefined) partial.smsgateway_deviceId = body.smsgateway_deviceId.trim();

      // Africa's Talking
      if (body.at_username?.trim()) partial.at_username = body.at_username.trim();
      if (body.at_apiKey?.trim()) partial.at_apiKey = body.at_apiKey.trim();
      if (body.at_senderId !== undefined) partial.at_senderId = body.at_senderId.trim();
      if (body.at_environment) partial.at_environment = body.at_environment;

      await saveSmsConfig(partial);

      logger.info("SMS config updated", { userId: user.userId, keys: Object.keys(partial) });

      return ApiResponse.success({ message: "SMS settings saved successfully" });
    } catch (error) {
      return handleApiError(error, { userId: user.userId, endpoint: "PUT /api/admin/settings/sms" });
    }
  })(request);
}
