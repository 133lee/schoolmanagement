import prisma from "@/lib/db/prisma";
import { SmsGatewayService } from "./smsGateway.service";
import { AfricasTalkingService } from "./africasTalking.service";
import { loadSmsConfig } from "@/lib/sms/sms-config";
import { smsLogRepository } from "./smsLog.repository";
import { systemSettingsRepository } from "@/features/settings/systemSettings.repository";
import { logger } from "@/lib/logger/logger";
import { ValidationError } from "@/lib/http/errors";
import { ExamType } from "@/types/prisma-enums";
import { Prisma } from "@prisma/client";

const EXAM_LABELS: Record<string, string> = {
  CAT: "CAT 1",
  MID: "Mid-Term",
  EOT: "End of Term",
};

export interface NotifyAssessmentInput {
  classId: string;
  termId: string;
  examType: "CAT" | "MID" | "EOT";
  provider: "SMS_GATEWAY" | "AFRICAS_TALKING";
  excludeStudentIds?: string[];
}

type SubjectScore = { subject: string; mark: number; totalMarks: number };

/**
 * Assessment Notify Service
 *
 * Sends per-student score SMS to the primary guardian, summarising all
 * subject marks for one exam type within a class/term.
 */
export class AssessmentNotifyService {
  async notify(input: NotifyAssessmentInput, sentByUserId: string) {
    const { classId, termId, examType, provider, excludeStudentIds = [] } = input;

    if (!classId) throw new ValidationError("classId is required");
    if (!termId) throw new ValidationError("termId is required");
    if (!examType || !["CAT", "MID", "EOT"].includes(examType)) {
      throw new ValidationError("examType must be CAT, MID, or EOT");
    }
    if (!provider) throw new ValidationError("provider is required");

    const excludeSet = new Set(excludeStudentIds);
    const examLabel = EXAM_LABELS[examType];

    const [schoolSetting, termRecord] = await Promise.all([
      systemSettingsRepository.findByKey("name").catch(() => null),
      prisma.term.findUnique({ where: { id: termId }, include: { academicYear: true } }),
    ]);
    const schoolName = typeof schoolSetting?.value === "string" ? schoolSetting.value : "School";
    const termLabel = termRecord
      ? `Term ${termRecord.termType.replace(/^TERM_(\d+)$/, "$1")} · ${termRecord.academicYear?.year ?? ""}`
      : "";

    const results = await prisma.studentAssessmentResult.findMany({
      where: {
        assessment: { classId, termId, examType: examType as ExamType, status: "COMPLETED" },
      },
      include: {
        assessment: { include: { subject: { select: { name: true } } } },
        student: {
          include: {
            studentGuardians: {
              orderBy: { isPrimary: "desc" },
              take: 1,
              include: { guardian: { select: { id: true, firstName: true, lastName: true, phone: true } } },
            },
          },
        },
      },
    });

    if (results.length === 0) {
      return {
        total: 0,
        sent: 0,
        failed: 0,
        noPhone: 0,
        noResults: 0,
        message: `No completed ${examLabel} results found for this class and term.`,
      };
    }

    const byStudent = new Map<
      string,
      {
        studentId: string;
        studentFirstName: string;
        studentLastName: string;
        guardian: { id: string; firstName: string; lastName: string; phone: string } | null;
        scores: SubjectScore[];
      }
    >();

    for (const r of results) {
      const s = r.student;
      if (!byStudent.has(s.id)) {
        const sg = s.studentGuardians[0];
        byStudent.set(s.id, {
          studentId: s.id,
          studentFirstName: s.firstName,
          studentLastName: s.lastName,
          guardian: sg ? { ...sg.guardian, phone: sg.guardian.phone ?? "" } : null,
          scores: [],
        });
      }
      byStudent.get(s.id)!.scores.push({
        subject: r.assessment.subject.name,
        mark: r.marksObtained,
        totalMarks: r.assessment.totalMarks,
      });
    }

    const config = await loadSmsConfig();
    const smsService =
      provider === "SMS_GATEWAY" ? new SmsGatewayService(config.smsgateway) : new AfricasTalkingService(config.africastalking);

    let sent = 0;
    let failed = 0;
    let noPhone = 0;
    let noResults = 0;
    const resultList: Array<{ student: string; phone: string; success: boolean; error?: string }> = [];

    logger.info("Starting assessment SMS notify", {
      classId,
      termId,
      examType,
      count: byStudent.size,
      userId: sentByUserId,
    });

    for (const entry of byStudent.values()) {
      if (excludeSet.has(entry.studentId)) continue;
      if (!entry.guardian?.phone?.trim()) {
        noPhone++;
        continue;
      }
      if (entry.scores.length === 0) {
        noResults++;
        continue;
      }

      const studentName = `${entry.studentFirstName} ${entry.studentLastName}`;
      const parentName = `${entry.guardian.firstName} ${entry.guardian.lastName}`;

      const scoreLines = entry.scores
        .slice(0, 5)
        .map((s) => {
          const abbrev = s.subject.length > 4 ? s.subject.slice(0, 4) : s.subject;
          const pct = Math.round((s.mark / s.totalMarks) * 100);
          return `${abbrev}: ${pct}%`;
        })
        .join(", ");
      const more = entry.scores.length > 5 ? ` +${entry.scores.length - 5} more` : "";

      const message = `Dear ${parentName}, ${studentName}'s ${examLabel} [${termLabel}]: ${scoreLines}${more}. - ${schoolName}`;

      const sendResult = await smsService.sendSMS(entry.guardian.phone, message);

      const logData: Prisma.SMSLogCreateInput = {
        guardian: { connect: { id: entry.guardian.id } },
        phoneNumber: entry.guardian.phone,
        message,
        provider,
        sentBy: sentByUserId,
        status: sendResult.success ? "SENT" : "FAILED",
        student: { connect: { id: entry.studentId } },
        ...(sendResult.success && { messageId: sendResult.messageId, cost: sendResult.cost, sentAt: new Date() }),
        ...(!sendResult.success && { error: sendResult.error }),
      };
      await smsLogRepository.create(logData).catch(() => null);

      if (sendResult.success) sent++;
      else failed++;
      resultList.push({
        student: studentName,
        phone: entry.guardian.phone,
        success: sendResult.success,
        error: sendResult.error,
      });

      await new Promise((r) => setTimeout(r, 120));
    }

    logger.info("Assessment SMS notify complete", { sent, failed, noPhone, userId: sentByUserId });

    return { total: byStudent.size, sent, failed, noPhone, noResults, results: resultList };
  }

  async getPreview(classId: string, termId: string, examType: string, detail: boolean) {
    if (!classId || !termId || !examType) {
      return { studentsWithResults: 0, studentsWithPhone: 0, students: [] as unknown[] };
    }

    const results = await prisma.studentAssessmentResult.findMany({
      where: {
        assessment: { classId, termId, examType: examType as ExamType, status: "COMPLETED" },
      },
      select: {
        studentId: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentNumber: true,
            studentGuardians: {
              orderBy: { isPrimary: "desc" },
              take: 1,
              select: { guardian: { select: { phone: true } } },
            },
          },
        },
      },
    });

    const uniqueStudents = new Map<
      string,
      { firstName: string; lastName: string; studentNumber: string; hasPhone: boolean }
    >();
    for (const r of results) {
      if (!uniqueStudents.has(r.studentId)) {
        const phone = r.student.studentGuardians[0]?.guardian?.phone;
        uniqueStudents.set(r.studentId, {
          firstName: r.student.firstName,
          lastName: r.student.lastName,
          studentNumber: r.student.studentNumber,
          hasPhone: !!phone?.trim(),
        });
      }
    }

    const studentList = Array.from(uniqueStudents.entries())
      .map(([id, s]) => ({
        id,
        firstName: s.firstName,
        lastName: s.lastName,
        studentNumber: s.studentNumber,
        hasPhone: s.hasPhone,
      }))
      .sort((a, b) => a.lastName.localeCompare(b.lastName));

    return {
      studentsWithResults: uniqueStudents.size,
      studentsWithPhone: studentList.filter((s) => s.hasPhone).length,
      ...(detail ? { students: studentList } : {}),
    };
  }
}

export const assessmentNotifyService = new AssessmentNotifyService();
