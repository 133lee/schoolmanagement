/**
 * Lightweight SMS sender for staff (teachers, admins).
 * Bypasses the guardian-based SMS service and sends directly to a phone number
 * using whichever provider is active in SMS settings.
 */

import { loadSmsConfig } from './sms-config';
import { SmsGatewayService } from '@/features/sms/smsGateway.service';
import { AfricasTalkingService } from '@/features/sms/africasTalking.service';
import { logger } from '@/lib/logger/logger';

export async function sendStaffSms(phone: string, message: string): Promise<void> {
  const config = await loadSmsConfig();

  let result: { success: boolean; error?: string };

  if (config.activeProvider === 'SMS_GATEWAY') {
    const service = new SmsGatewayService(config.smsgateway);
    result = await service.sendSMS(phone, message);
  } else {
    const service = new AfricasTalkingService(config.africastalking);
    result = await service.sendSMS(phone, message);
  }

  if (!result.success) {
    logger.warn('Staff SMS failed to send', { phone, error: result.error });
  }
}
