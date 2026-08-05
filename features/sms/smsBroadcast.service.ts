import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { ValidationError } from "@/lib/http/errors";
import { SmsGatewayService } from "./smsGateway.service";
import { AfricasTalkingService } from "./africasTalking.service";
import { loadSmsConfig } from "@/lib/sms/sms-config";
import { smsLogRepository } from "./smsLog.repository";
import { systemSettingsRepository } from "@/features/settings/systemSettings.repository";
import { logger } from "@/lib/logger/logger";

export type BroadcastRecipientType = "ALL" | "GRADE" | "CLASS" | "INDIVIDUAL";
export type SmsProviderChoice = "SMS_GATEWAY" | "AFRICAS_TALKING";

export interface RecipientRow {
  guardianId: string;
  guardianFirstName: string;
  guardianLastName: string;
  phone: string;
  studentFirstName: string;
  studentLastName: string;
  studentId: string;
}

export interface SendBroadcastInput {
  message: string;
  provider: SmsProviderChoice;
  recipientType: BroadcastRecipientType;
  classId?: string;
  gradeId?: string;
  guardianIds?: string[];
}

function substituteVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

/**
 * SMS Broadcast Service
 *
 * Resolves recipient lists (all guardians / by grade / by class / hand-picked)
 * and sends a personalised broadcast SMS to each, logging every send attempt.
 */
export class SmsBroadcastService {
  async resolveRecipients(
    type: BroadcastRecipientType,
    opts: { classId?: string; gradeId?: string; guardianIds?: string[] }
  ): Promise<RecipientRow[]> {
    if (type === "INDIVIDUAL" && opts.guardianIds?.length) {
      const guardians = await prisma.guardian.findMany({
        where: { id: { in: opts.guardianIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          studentGuardians: {
            orderBy: { isPrimary: "desc" },
            take: 1,
            select: { student: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      });
      return guardians.map((g) => {
        const student = g.studentGuardians[0]?.student;
        return {
          guardianId: g.id,
          guardianFirstName: g.firstName,
          guardianLastName: g.lastName,
          phone: g.phone ?? "",
          studentId: student?.id ?? "",
          studentFirstName: student?.firstName ?? "",
          studentLastName: student?.lastName ?? "",
        };
      });
    }

    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });

    const whereEnrollment: Prisma.StudentClassEnrollmentWhereInput = { status: "ACTIVE" };
    if (activeYear) whereEnrollment.academicYearId = activeYear.id;
    if (type === "CLASS" && opts.classId) whereEnrollment.classId = opts.classId;
    if (type === "GRADE" && opts.gradeId) whereEnrollment.class = { gradeId: opts.gradeId };

    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: whereEnrollment,
      select: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentGuardians: {
              orderBy: { isPrimary: "desc" },
              select: {
                guardian: { select: { id: true, firstName: true, lastName: true, phone: true } },
                isPrimary: true,
              },
            },
          },
        },
      },
    });

    // Deduplicate: one entry per guardian, first student wins for variable substitution
    const seen = new Map<string, RecipientRow>();
    for (const enrollment of enrollments) {
      const student = enrollment.student;
      for (const sg of student.studentGuardians) {
        const g = sg.guardian;
        if (!seen.has(g.id)) {
          seen.set(g.id, {
            guardianId: g.id,
            guardianFirstName: g.firstName,
            guardianLastName: g.lastName,
            phone: g.phone ?? "",
            studentId: student.id,
            studentFirstName: student.firstName,
            studentLastName: student.lastName,
          });
        }
      }
    }

    return Array.from(seen.values());
  }

  async previewBroadcast(
    type: BroadcastRecipientType,
    opts: { classId?: string; gradeId?: string; guardianIds?: string[] }
  ) {
    const recipients = await this.resolveRecipients(type, opts);

    return {
      total: recipients.length,
      withPhone: recipients.filter((r) => Boolean(r.phone?.trim())).length,
      sample: recipients.slice(0, 5).map((r) => ({
        name: `${r.guardianFirstName} ${r.guardianLastName}`,
        phone: r.phone || "—",
        studentName: `${r.studentFirstName} ${r.studentLastName}`,
      })),
    };
  }

  async sendBroadcast(input: SendBroadcastInput, sentByUserId: string) {
    const { message, provider, recipientType, classId, gradeId, guardianIds = [] } = input;

    if (!message?.trim()) throw new ValidationError("Message is required");
    if (!provider) throw new ValidationError("Provider is required");
    if (!recipientType) throw new ValidationError("Recipient type is required");

    const schoolSetting = await systemSettingsRepository.findByKey("name").catch(() => null);
    const schoolName = typeof schoolSetting?.value === "string" ? schoolSetting.value : "School";

    const recipients = await this.resolveRecipients(recipientType, { classId, gradeId, guardianIds });
    const withPhone = recipients.filter((r) => r.phone?.trim());

    if (withPhone.length === 0) {
      return { total: 0, sent: 0, failed: 0, noPhone: recipients.length, results: [] };
    }

    if (withPhone.length > 500) throw new ValidationError("Recipient limit is 500 per broadcast");

    logger.info("Starting SMS broadcast", {
      recipientType,
      count: withPhone.length,
      provider,
      userId: sentByUserId,
    });

    const config = await loadSmsConfig();
    const smsService =
      provider === "SMS_GATEWAY" ? new SmsGatewayService(config.smsgateway) : new AfricasTalkingService(config.africastalking);

    let sent = 0;
    let failed = 0;
    const results: Array<{ name: string; phone: string; success: boolean; error?: string }> = [];

    for (const recipient of withPhone) {
      const personalised = substituteVars(message, {
        parentName: `${recipient.guardianFirstName} ${recipient.guardianLastName}`,
        studentName: `${recipient.studentFirstName} ${recipient.studentLastName}`,
        schoolName,
        date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      });

      const result = await smsService.sendSMS(recipient.phone, personalised);

      const logData: Prisma.SMSLogCreateInput = {
        guardian: { connect: { id: recipient.guardianId } },
        phoneNumber: recipient.phone,
        message: personalised,
        provider,
        sentBy: sentByUserId,
        status: result.success ? "SENT" : "FAILED",
        ...(recipient.studentId && { student: { connect: { id: recipient.studentId } } }),
        ...(result.success && { messageId: result.messageId, cost: result.cost, sentAt: new Date() }),
        ...(!result.success && { error: result.error }),
      };

      await smsLogRepository.create(logData).catch(() => null);

      if (result.success) sent++;
      else failed++;

      results.push({
        name: `${recipient.guardianFirstName} ${recipient.guardianLastName}`,
        phone: recipient.phone,
        success: result.success,
        error: result.error,
      });

      await new Promise((r) => setTimeout(r, 120));
    }

    logger.info("Broadcast complete", { sent, failed, userId: sentByUserId });

    return {
      total: recipients.length,
      sent,
      failed,
      noPhone: recipients.length - withPhone.length,
      results,
    };
  }
}

export const smsBroadcastService = new SmsBroadcastService();
