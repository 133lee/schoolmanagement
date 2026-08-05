/**
 * SMS Gateway for Android — Cloud Mode
 *
 * Sends SMS through an Android phone acting as a gateway, relayed via the
 * project's free hosted cloud relay (api.sms-gate.app) so this app doesn't
 * need a public IP or to be on the same network as the phone. The phone
 * uses its own SIM card credits — the cloud relay itself is free.
 *
 * Setup:
 *  1. Install "SMS Gateway for Android" on a phone with a Zambian SIM.
 *  2. Enable Cloud Mode in the app and note the username/password it shows.
 *  3. Enter those credentials in Admin → Settings → Notifications.
 *
 * API docs: https://docs.sms-gate.app/integration/api/
 */

import { logger } from "@/lib/logger/logger";
import { SMSSendResult, SMSBalanceResult } from "./africasTalking.service";

const SMS_GATEWAY_BASE_URL = "https://api.sms-gate.app/3rdparty/v1";

export class SmsGatewayService {
  private username: string;
  private password: string;
  private deviceId: string;

  constructor(config?: { username?: string; password?: string; deviceId?: string }) {
    this.username = config?.username ?? process.env.SMS_GATEWAY_USERNAME ?? "";
    this.password = config?.password ?? process.env.SMS_GATEWAY_PASSWORD ?? "";
    this.deviceId = config?.deviceId ?? process.env.SMS_GATEWAY_DEVICE_ID ?? "";

    if (!this.isConfigured()) {
      logger.warn("SMS Gateway (Cloud Mode) not configured — set SMS_GATEWAY_USERNAME and SMS_GATEWAY_PASSWORD");
    } else {
      logger.info("SMS Gateway (Cloud Mode) initialised", { username: this.username });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.username && this.password);
  }

  private authHeader(): string {
    return "Basic " + Buffer.from(`${this.username}:${this.password}`).toString("base64");
  }

  /**
   * Send a single SMS through the Android gateway phone via the cloud relay.
   */
  async sendSMS(phoneNumber: string, message: string): Promise<SMSSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "SMS Gateway not configured. Add the Cloud Mode username and password in Settings.",
      };
    }

    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      return {
        success: false,
        error: `Invalid phone number: ${phoneNumber}. Must be a valid Zambian number (e.g. +260971234567)`,
      };
    }

    try {
      logger.info("Sending SMS via SMS Gateway (Cloud Mode)", {
        to: formattedPhone,
        messageLength: message.length,
      });

      const response = await fetch(`${SMS_GATEWAY_BASE_URL}/messages`, {
        method: "POST",
        headers: {
          Authorization: this.authHeader(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          textMessage: { text: message },
          phoneNumbers: [formattedPhone],
          ...(this.deviceId && { deviceId: this.deviceId }),
        }),
      });

      const data = await response.json();

      if ((response.status === 202 || response.ok) && data.id) {
        logger.info("SMS queued successfully via SMS Gateway", { messageId: data.id, state: data.state });
        return {
          success: true,
          messageId: data.id,
          status: data.state ?? "Pending",
        };
      }

      const errorMessage = data.message || data.error || "SMS Gateway rejected the request";
      logger.error("SMS Gateway send failed", undefined, { status: response.status, body: data });
      return { success: false, error: errorMessage };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("SMS Gateway network error", error instanceof Error ? error : undefined, { error: message });
      return { success: false, error: message || "Network error contacting SMS Gateway" };
    }
  }

  /**
   * Send to multiple recipients sequentially (same pattern as the other providers).
   */
  async sendBulkSMS(phoneNumbers: string[], message: string): Promise<SMSSendResult[]> {
    const results: SMSSendResult[] = [];
    for (const phone of phoneNumbers) {
      results.push(await this.sendSMS(phone, message));
      await new Promise((r) => setTimeout(r, 100));
    }
    return results;
  }

  /**
   * Cloud Mode relay is free — cost sits on the gateway phone's SIM bundle,
   * not on any account balance here.
   */
  async checkBalance(): Promise<SMSBalanceResult | null> {
    if (!this.isConfigured()) return null;
    return {
      balance: "N/A — Cloud relay is free, cost is only the SIM bundle on the gateway phone",
      currency: "ZMW",
    };
  }

  /**
   * Verify the credentials are accepted by listing registered devices.
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return { success: false, message: "SMS Gateway not configured — set the Cloud Mode username and password" };
    }

    try {
      const response = await fetch(`${SMS_GATEWAY_BASE_URL}/devices`, {
        headers: {
          Authorization: this.authHeader(),
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const devices: Array<{ id: string; name?: string }> = Array.isArray(data) ? data : [];
        const registered = devices.map((d) => d.name || d.id).join(", ");
        return {
          success: true,
          message: devices.length
            ? `Connected. Registered device${devices.length !== 1 ? "s" : ""}: ${registered}`
            : "Connected, but no devices are registered yet — open the app and enable Cloud Mode on the gateway phone.",
        };
      }

      if (response.status === 401) {
        return { success: false, message: "SMS Gateway rejected the username/password" };
      }

      return {
        success: false,
        message: data.message || `SMS Gateway returned HTTP ${response.status}`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, message: message || "Failed to reach SMS Gateway API" };
    }
  }

  /**
   * Normalise Zambian phone numbers to E.164 (+260XXXXXXXXX).
   */
  private formatPhoneNumber(phone: string): string | null {
    const cleaned = phone.replace(/\D/g, "");

    if (cleaned.startsWith("260") && cleaned.length >= 12) return `+${cleaned}`;
    if (cleaned.startsWith("0") && cleaned.length === 10) return `+260${cleaned.slice(1)}`;
    if (cleaned.length === 9) return `+260${cleaned}`;

    return null;
  }
}

export const smsGatewayService = new SmsGatewayService();
