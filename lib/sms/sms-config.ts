import { systemSettingsRepository } from "@/features/settings/systemSettings.repository";

export interface SmsGatewayConfig {
  username: string;
  password: string;
  deviceId: string;
}

export interface AfricasTalkingConfig {
  username: string;
  apiKey: string;
  senderId: string;
  environment: "sandbox" | "production";
}

export interface SmsConfig {
  activeProvider: "SMS_GATEWAY" | "AFRICAS_TALKING";
  smsgateway: SmsGatewayConfig;
  africastalking: AfricasTalkingConfig;
}

async function getSettingsMap(): Promise<Record<string, string>> {
  const settings = await systemSettingsRepository.findByCategory("sms");
  const map: Record<string, string> = {};
  settings.forEach((s) => {
    map[s.key] = typeof s.value === "string" ? s.value : String(s.value ?? "");
  });
  return map;
}

export async function loadSmsConfig(): Promise<SmsConfig> {
  const map = await getSettingsMap();
  return {
    activeProvider:
      (map["sms.activeProvider"] as SmsConfig["activeProvider"]) ||
      (process.env.SMS_ACTIVE_PROVIDER as SmsConfig["activeProvider"]) ||
      "AFRICAS_TALKING",
    smsgateway: {
      username: map["sms.smsgateway.username"] || process.env.SMS_GATEWAY_USERNAME || "",
      password: map["sms.smsgateway.password"] || process.env.SMS_GATEWAY_PASSWORD || "",
      deviceId: map["sms.smsgateway.deviceId"] || process.env.SMS_GATEWAY_DEVICE_ID || "",
    },
    africastalking: {
      username: map["sms.at.username"] || process.env.AFRICAS_TALKING_USERNAME || "",
      apiKey: map["sms.at.apiKey"] || process.env.AFRICAS_TALKING_API_KEY || "",
      senderId: map["sms.at.senderId"] || process.env.AFRICAS_TALKING_SENDER_ID || "",
      environment:
        (map["sms.at.environment"] as "sandbox" | "production") ||
        (process.env.AFRICASTALKING_ENV as "sandbox" | "production") ||
        "sandbox",
    },
  };
}

export async function saveSmsConfig(partial: Partial<{
  activeProvider: string;
  smsgateway_username: string;
  smsgateway_password: string;
  smsgateway_deviceId: string;
  at_username: string;
  at_apiKey: string;
  at_senderId: string;
  at_environment: string;
}>): Promise<void> {
  const entries: Array<{ key: string; value: any; category: string }> = [];

  if (partial.activeProvider !== undefined)
    entries.push({ key: "sms.activeProvider", value: partial.activeProvider, category: "sms" });
  if (partial.smsgateway_username !== undefined)
    entries.push({ key: "sms.smsgateway.username", value: partial.smsgateway_username, category: "sms" });
  if (partial.smsgateway_password !== undefined)
    entries.push({ key: "sms.smsgateway.password", value: partial.smsgateway_password, category: "sms" });
  if (partial.smsgateway_deviceId !== undefined)
    entries.push({ key: "sms.smsgateway.deviceId", value: partial.smsgateway_deviceId, category: "sms" });
  if (partial.at_username !== undefined)
    entries.push({ key: "sms.at.username", value: partial.at_username, category: "sms" });
  if (partial.at_apiKey !== undefined)
    entries.push({ key: "sms.at.apiKey", value: partial.at_apiKey, category: "sms" });
  if (partial.at_senderId !== undefined)
    entries.push({ key: "sms.at.senderId", value: partial.at_senderId, category: "sms" });
  if (partial.at_environment !== undefined)
    entries.push({ key: "sms.at.environment", value: partial.at_environment, category: "sms" });

  if (entries.length > 0) {
    await systemSettingsRepository.upsertMany(entries);
  }
}

export function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? "••••••••" : "";
  return `${"•".repeat(key.length - 4)}${key.slice(-4)}`;
}
