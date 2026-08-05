import { describe, it, expect, beforeEach } from "vitest";
import { Role, ParentRelationship } from "@prisma/client";
import { POST as sendSms } from "@/app/api/sms/send/route";
import { GET as getSmsLogs } from "@/app/api/sms/logs/route";
import {
  GET as getTemplates,
  POST as createTemplate,
} from "@/app/api/sms/templates/route";
import { PUT as updateTemplate, DELETE as deleteTemplate } from "@/app/api/sms/templates/[id]/route";
import { POST as seedTemplates } from "@/app/api/sms/templates/seed/route";
import { GET as getBalance } from "@/app/api/sms/balance/route";
import { GET as testConnection } from "@/app/api/sms/test/route";
import { POST as sendBroadcast } from "@/app/api/sms/broadcast/route";
import { GET as previewBroadcast } from "@/app/api/sms/broadcast/preview/route";
import { POST as notifyAssessment, GET as previewAssessmentNotify } from "@/app/api/sms/assessment-notify/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestStudent,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestClassSubject,
  assignSubjectTeacher,
  enrollTestStudent,
} from "../helpers/db";
import prisma from "@/lib/db/prisma";

// The test environment has no real SMS_GATEWAY / AFRICAS_TALKING credentials
// configured (matches the "not configured" warnings logged on every dev
// server start) — both provider services detect this via isConfigured() and
// short-circuit before ever making a network call, returning a deterministic
// "not configured" failure result instead. That's what these tests exercise:
// the full route -> service -> log chain, not real SMS delivery.
describe("sms routes", () => {
  let teacherToken: string;
  let adminToken: string;
  let guardianId: string;

  beforeEach(async () => {
    await resetDb();
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);

    const guardian = await prisma.guardian.create({
      data: { firstName: "Jane", lastName: "Banda", phone: "+260977123456", status: "ACTIVE" },
    });
    guardianId = guardian.id;
  });

  describe("POST /api/sms/send + GET /api/sms/logs", () => {
    it("creates a FAILED log entry when the provider isn't configured, visible via logs", async () => {
      const sent = await callRoute<{ data: { success: boolean; logId: string } }>(sendSms, {
        method: "POST",
        url: "/api/sms/send",
        token: teacherToken,
        body: { guardianId, message: "Test message" },
      });
      expect(sent.status).toBe(200);
      expect(sent.json.data.success).toBe(false);
      expect(sent.json.data.logId).toBeTruthy();

      const logs = await callRoute<{ data: { logs: { id: string; status: string }[] } }>(getSmsLogs, {
        url: "/api/sms/logs",
        token: teacherToken,
      });
      expect(logs.status).toBe(200);
      const created = logs.json.data.logs.find((l) => l.id === sent.json.data.logId);
      expect(created?.status).toBe("FAILED");
    });

    it("rejects an empty message", async () => {
      const { status } = await callRoute(sendSms, {
        method: "POST",
        url: "/api/sms/send",
        token: teacherToken,
        body: { guardianId, message: "" },
      });
      expect(status).toBe(400);
    });
  });

  describe("SMS templates (ADMIN-only writes, TEACHER+ reads)", () => {
    it("supports the full create/list/update/delete lifecycle for ADMIN, rejects TEACHER writes", async () => {
      const deniedCreate = await callRoute(createTemplate, {
        method: "POST",
        url: "/api/sms/templates",
        token: teacherToken,
        body: {
          name: "Absence Alert",
          template: "Your child {studentName} was absent today",
          variables: ["studentName"],
          category: "ATTENDANCE",
        },
      });
      expect(deniedCreate.status).toBe(403);

      const created = await callRoute<{ data: { id: string } }>(createTemplate, {
        method: "POST",
        url: "/api/sms/templates",
        token: adminToken,
        body: {
          name: "Absence Alert",
          template: "Your child {studentName} was absent today",
          variables: ["studentName"],
          category: "ATTENDANCE",
        },
      });
      expect(created.status).toBe(200);
      const templateId = created.json.data.id;

      const list = await callRoute<{ data: { id: string }[] }>(getTemplates, {
        url: "/api/sms/templates",
        token: teacherToken,
      });
      expect(list.status).toBe(200);
      expect(list.json.data.map((t) => t.id)).toContain(templateId);

      const updated = await callRoute<{ data: { isActive: boolean } }>(updateTemplate, {
        method: "PUT",
        url: `/api/sms/templates/${templateId}`,
        token: adminToken,
        params: { id: templateId },
        body: { isActive: false },
      });
      expect(updated.status).toBe(200);
      expect(updated.json.data.isActive).toBe(false);

      const deniedDelete = await callRoute(deleteTemplate, {
        method: "DELETE",
        url: `/api/sms/templates/${templateId}`,
        token: teacherToken,
        params: { id: templateId },
      });
      expect(deniedDelete.status).toBe(403);

      const deleted = await callRoute(deleteTemplate, {
        method: "DELETE",
        url: `/api/sms/templates/${templateId}`,
        token: adminToken,
        params: { id: templateId },
      });
      expect(deleted.status).toBe(200);
    });

    it("POST /api/sms/templates/seed is ADMIN-only", async () => {
      const denied = await callRoute(seedTemplates, {
        method: "POST",
        url: "/api/sms/templates/seed",
        token: teacherToken,
      });
      expect(denied.status).toBe(403);

      const { status } = await callRoute(seedTemplates, {
        method: "POST",
        url: "/api/sms/templates/seed",
        token: adminToken,
      });
      expect(status).toBe(200);
    });
  });

  describe("GET /api/sms/balance and /api/sms/test", () => {
    it("return a graceful 'not configured' result rather than erroring", async () => {
      const balance = await callRoute<{ data: unknown }>(getBalance, {
        url: "/api/sms/balance?provider=AFRICAS_TALKING",
        token: teacherToken,
      });
      expect(balance.status).toBe(200);
      expect(balance.json.data).toBeNull();

      const test = await callRoute<{ data: { success: boolean; message: string } }>(testConnection, {
        url: "/api/sms/test?provider=AFRICAS_TALKING",
        token: teacherToken,
      });
      expect(test.status).toBe(200);
      expect(test.json.data.success).toBe(false);
      expect(test.json.data.message).toMatch(/not configured/i);
    });
  });

  describe("broadcast + preview", () => {
    it("previews and sends a broadcast to all guardians", async () => {
      // resolveRecipients("ALL") queries active StudentClassEnrollment rows
      // (scoped to the active academic year), not just the guardian link —
      // an unenrolled student's guardian is never included.
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const student = await createTestStudent();
      await enrollTestStudent(student.id, testClass.id, academicYear.id);
      await prisma.studentGuardian.create({
        data: { studentId: student.id, guardianId, relationship: ParentRelationship.MOTHER, isPrimary: true },
      });

      const preview = await callRoute<{ data: { total: number } }>(previewBroadcast, {
        url: "/api/sms/broadcast/preview?type=ALL",
        token: teacherToken,
      });
      expect(preview.status).toBe(200);
      expect(preview.json.data.total).toBeGreaterThanOrEqual(1);

      const sent = await callRoute<{ data: { totalSent: number } | unknown }>(sendBroadcast, {
        method: "POST",
        url: "/api/sms/broadcast",
        token: teacherToken,
        body: { message: "School closes early Friday", provider: "AFRICAS_TALKING", recipientType: "ALL" },
      });
      expect(sent.status).toBe(200);
    });
  });

  describe("assessment-notify", () => {
    it("previews and sends assessment score notifications, scoped to TEACHER+", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject();
      await createTestClassSubject(testClass.id, subject.id);

      const teacher = await createTestUser({ role: Role.TEACHER });
      await assignSubjectTeacher(teacher.teacherProfile!.id, subject.id, testClass.id, academicYear.id);
      const scopedTeacherToken = await loginAs(teacher.user.email, teacher.password);

      const student = await createTestStudent();
      await enrollTestStudent(student.id, testClass.id, academicYear.id);

      const preview = await callRoute<{ data: { total?: number } }>(previewAssessmentNotify, {
        url: `/api/sms/assessment-notify?classId=${testClass.id}&termId=${term.id}&examType=CAT`,
        token: scopedTeacherToken,
      });
      expect(preview.status).toBe(200);

      const sent = await callRoute(notifyAssessment, {
        method: "POST",
        url: "/api/sms/assessment-notify",
        token: scopedTeacherToken,
        body: { classId: testClass.id, termId: term.id, examType: "CAT", provider: "AFRICAS_TALKING" },
      });
      expect(sent.status).toBe(200);
    });
  });
});
