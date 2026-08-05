/**
 * Africa's Talking SMS Service
 *
 * Integration with Africa's Talking SMS API for Zambia.
 * Handles sending SMS messages and checking balance.
 *
 * API Documentation: https://developers.africastalking.com/docs/sms/overview
 */

import { logger } from "@/lib/logger/logger";

export interface SMSSendResult {
  success: boolean;
  messageId?: string;
  cost?: number;
  status?: string;
  error?: string;
}

export interface SMSBalanceResult {
  balance: string;
  currency: string;
}

export class AfricasTalkingService {
  private username: string;
  private apiKey: string;
  private senderId: string;
  private baseUrl: string;

  constructor(config?: { username?: string; apiKey?: string; senderId?: string; environment?: string }) {
    const env = config?.environment ?? process.env.AFRICASTALKING_ENV ?? "production";

    // In sandbox mode, username MUST be "sandbox"
    this.username = env === "sandbox"
      ? "sandbox"
      : (config?.username ?? process.env.AFRICAS_TALKING_USERNAME ?? "");

    this.apiKey = config?.apiKey ?? process.env.AFRICAS_TALKING_API_KEY ?? "";
    this.senderId = config?.senderId ?? process.env.AFRICAS_TALKING_SENDER_ID ?? "";

    this.baseUrl = env === "sandbox"
      ? "https://api.sandbox.africastalking.com/version1"
      : "https://api.africastalking.com/version1";

    if (!this.username || !this.apiKey) {
      logger.warn("Africa's Talking credentials not configured");
    } else {
      logger.info("Africa's Talking service initialized", {
        environment: env,
        username: this.username,
        baseUrl: this.baseUrl,
      });
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return Boolean(this.username && this.apiKey);
  }

  /**
   * Send SMS to a single recipient
   */
  async sendSMS(phoneNumber: string, message: string): Promise<SMSSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Africa's Talking SMS service not configured. Please add credentials to environment variables.",
      };
    }

    try {
      // Validate phone number format (Zambian numbers should start with +260)
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        return {
          success: false,
          error: `Invalid phone number format: ${phoneNumber}. Must be a valid Zambian number (e.g., +260971234567)`,
        };
      }

      logger.info("Sending SMS via Africa's Talking", {
        to: formattedPhone,
        messageLength: message.length,
      });

      const url = `${this.baseUrl}/messaging`;
      const body = new URLSearchParams({
        username: this.username,
        to: formattedPhone,
        message: message,
        ...(this.senderId && { from: this.senderId }),
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          apiKey: this.apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
      });

      const data = await response.json();

      // Africa's Talking returns 200/201 for successful requests
      if (response.ok && data.SMSMessageData?.Recipients?.length > 0) {
        const recipient = data.SMSMessageData.Recipients[0];

        // Check if message was actually sent successfully
        if (recipient.statusCode === 101 || recipient.statusCode === 102) {
          logger.info("SMS sent successfully", {
            messageId: recipient.messageId,
            cost: recipient.cost,
            to: formattedPhone,
          });

          return {
            success: true,
            messageId: recipient.messageId,
            cost: this.parseCost(recipient.cost),
            status: recipient.status,
          };
        } else {
          logger.error("SMS failed to send", undefined, {
            statusCode: recipient.statusCode,
            status: recipient.status,
            to: formattedPhone,
          });

          return {
            success: false,
            error: `SMS failed: ${recipient.status} (Code: ${recipient.statusCode})`,
          };
        }
      } else {
        logger.error("Failed to send SMS", undefined, {
          status: response.status,
          data,
        });

        return {
          success: false,
          error: data.SMSMessageData?.Message || "Failed to send SMS",
        };
      }
    } catch (error: any) {
      logger.error("Error sending SMS via Africa's Talking", error instanceof Error ? error : undefined, { error });

      return {
        success: false,
        error: error.message || "Unknown error occurred while sending SMS",
      };
    }
  }

  /**
   * Send bulk SMS to multiple recipients
   */
  async sendBulkSMS(
    phoneNumbers: string[],
    message: string
  ): Promise<SMSSendResult[]> {
    // Africa's Talking supports bulk SMS, but we'll send individually for better tracking
    // This ensures each message has its own log entry and status
    const results: SMSSendResult[] = [];

    for (const phoneNumber of phoneNumbers) {
      const result = await this.sendSMS(phoneNumber, message);
      results.push(result);

      // Add small delay to avoid rate limiting
      await this.delay(100);
    }

    return results;
  }

  /**
   * Check SMS balance
   */
  async checkBalance(): Promise<SMSBalanceResult | null> {
    if (!this.isConfigured()) {
      logger.warn("Cannot check balance: Africa's Talking not configured");
      return null;
    }

    try {
      const url = `${this.baseUrl}/user?username=${this.username}`;

      logger.debug("Checking SMS balance", {
        url,
        username: this.username,
      });

      const response = await fetch(url, {
        method: "GET",
        headers: {
          apiKey: this.apiKey,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();

        logger.debug("Balance API response", { data });

        if (data.UserData) {
          logger.info("SMS balance retrieved", {
            balance: data.UserData.balance,
            currency: data.UserData.currency || "ZMW",
          });

          return {
            balance: data.UserData.balance,
            currency: data.UserData.currency || "ZMW",
          };
        } else {
          logger.error("Balance API returned unexpected format", undefined, { responseData: data });
          return null;
        }
      } else {
        const errorText = await response.text();
        logger.error("Failed to check SMS balance", undefined, {
          status: response.status,
          statusText: response.statusText,
          responseError: errorText,
        });

        return null;
      }
    } catch (error: any) {
      logger.error("Error checking SMS balance", error instanceof Error ? error : undefined, {
        errorMessage: error.message || "Unknown error",
        errorName: error.name,
      });
      return null;
    }
  }

  /**
   * Format phone number to international format
   * Zambian numbers: +260 971234567
   */
  private formatPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, "");

    // Handle different formats
    if (cleaned.startsWith("260")) {
      // Already has country code
      return `+${cleaned}`;
    } else if (cleaned.startsWith("0")) {
      // Remove leading 0 and add country code
      return `+260${cleaned.substring(1)}`;
    } else if (cleaned.length === 9) {
      // Just the number without 0 or country code
      return `+260${cleaned}`;
    }

    // Invalid format
    return null;
  }

  /**
   * Parse cost string to number
   * Africa's Talking returns cost like "ZMW 0.05"
   */
  private parseCost(costString: string): number {
    try {
      const match = costString.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test connection to Africa's Talking API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "Africa's Talking credentials not configured",
      };
    }

    try {
      const balance = await this.checkBalance();

      if (balance) {
        return {
          success: true,
          message: `Connected successfully. Balance: ${balance.balance} ${balance.currency}`,
        };
      } else {
        return {
          success: false,
          message: "Failed to connect to Africa's Talking API",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Connection test failed",
      };
    }
  }
}

// Singleton instance
export const africasTalkingService = new AfricasTalkingService();
