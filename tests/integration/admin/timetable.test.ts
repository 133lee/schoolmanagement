import { describe, it, expect, beforeEach } from "vitest";
import { Role, DayOfWeek } from "@prisma/client";
import { GET as getConfiguration, POST as postConfiguration } from "@/app/api/admin/timetable/configuration/route";
import { POST as generateTimetable } from "@/app/api/admin/timetable/generate/route";
import { POST as swapSlots } from "@/app/api/admin/timetable/swap/route";
import { GET as getView } from "@/app/api/admin/timetable/view/route";
import { GET as exportPdf } from "@/app/api/admin/timetable/export-pdf/route";
import prisma from "@/lib/db/prisma";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestStudent,
  enrollTestStudent,
  createTestClassSubject,
  createTestTimetableConfiguration,
} from "../../helpers/db";

describe("admin/timetable", () => {
  let adminToken: string;
  let teacherToken: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
  });

  describe("configuration (bare response shape)", () => {
    it("404s with no active academic year, then creates/reads config once one exists", async () => {
      const noYear = await callRoute(getConfiguration, { url: "/api/admin/timetable/configuration", token: adminToken });
      expect(noYear.status).toBe(404);

      const academicYear = await createTestAcademicYear();

      const created = await callRoute<{ configuration: { totalPeriods: number } }>(postConfiguration, {
        method: "POST",
        url: "/api/admin/timetable/configuration",
        token: adminToken,
        body: {
          academicYearId: academicYear.id,
          schoolStartTime: "07:00",
          periodDuration: 40,
          breakStartPeriod: 4,
          breakDuration: 15,
          periodsBeforeBreak: 4,
          periodsAfterBreak: 4,
          totalPeriods: 8,
        },
      });
      expect(created.status).toBe(200);
      expect(created.json.configuration.totalPeriods).toBe(8);

      const denied = await callRoute(postConfiguration, {
        method: "POST",
        url: "/api/admin/timetable/configuration",
        token: teacherToken,
        body: { academicYearId: academicYear.id },
      });
      expect(denied.status).toBe(403);

      const got = await callRoute<{ configuration: { totalPeriods: number } | null }>(getConfiguration, {
        url: "/api/admin/timetable/configuration",
        token: adminToken,
      });
      expect(got.status).toBe(200);
      expect(got.json.configuration?.totalPeriods).toBe(8);
    });
  });

  describe("view (bare response shape)", () => {
    it("allows ADMIN, rejects a plain TEACHER (not HOD), and returns a real seeded slot", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject({ name: "Geography" });
      const slotTeacher = await createTestUser({ role: Role.TEACHER });
      const slot = await prisma.timetableSlot.create({
        data: {
          classId: testClass.id,
          subjectId: subject.id,
          teacherId: slotTeacher.teacherProfile!.id,
          academicYearId: academicYear.id,
          dayOfWeek: DayOfWeek.WEDNESDAY,
          periodNumber: 3,
          startTime: "09:00",
          endTime: "09:40",
        },
      });

      const asAdmin = await callRoute<{ slots: { id: string; subject: { name: string } }[] }>(getView, {
        url: "/api/admin/timetable/view",
        token: adminToken,
      });
      expect(asAdmin.status).toBe(200);
      expect(asAdmin.json.slots).toHaveLength(1);
      expect(asAdmin.json.slots[0].id).toBe(slot.id);
      expect(asAdmin.json.slots[0].subject.name).toBe("Geography");

      const asTeacher = await callRoute(getView, { url: "/api/admin/timetable/view", token: teacherToken });
      expect(asTeacher.status).toBe(403);
    });
  });

  describe("generate (bare response shape)", () => {
    it("404s when there's no active academic year at all", async () => {
      const { status } = await callRoute(generateTimetable, {
        method: "POST",
        url: "/api/admin/timetable/generate",
        token: adminToken,
      });
      expect(status).toBe(404);
    });

    it("rejects a plain TEACHER once an academic year exists (role check runs inside generateTimetable, after the academic-year lookup)", async () => {
      await createTestAcademicYear();

      const { status } = await callRoute(generateTimetable, {
        method: "POST",
        url: "/api/admin/timetable/generate",
        token: teacherToken,
      });
      expect(status).toBe(403);
    });

    it("404s for ADMIN when curriculum prerequisites (subject-teacher assignments) are missing", async () => {
      await createTestAcademicYear();

      const { status } = await callRoute(generateTimetable, {
        method: "POST",
        url: "/api/admin/timetable/generate",
        token: adminToken,
      });
      expect(status).toBe(404);
    });

    it("actually runs the solver and places a real slot for a minimal one-subject curriculum", async () => {
      const academicYear = await createTestAcademicYear();
      await createTestTimetableConfiguration(academicYear.id, {
        totalPeriods: 2,
        periodsBeforeBreak: 1,
        periodsAfterBreak: 1,
      });
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject();
      const slotTeacher = await createTestUser({ role: Role.TEACHER });
      const student = await createTestStudent();

      // classSubjects lookup requires the class to have at least one
      // enrollment for this academic year, and one periodsPerWeek unit is
      // enough to give the solver a trivially satisfiable single placement.
      await enrollTestStudent(student.id, testClass.id, academicYear.id);
      await createTestClassSubject(testClass.id, subject.id, { periodsPerWeek: 1 });
      await prisma.subjectTeacherAssignment.create({
        data: {
          teacherId: slotTeacher.teacherProfile!.id,
          subjectId: subject.id,
          classId: testClass.id,
          academicYearId: academicYear.id,
        },
      });

      const { status, json } = await callRoute<{
        message: string;
        stats: { slotsGenerated: number; conflicts: number };
        conflicts: unknown[];
      }>(generateTimetable, { method: "POST", url: "/api/admin/timetable/generate", token: adminToken });

      expect(status).toBe(200);
      expect(json.stats.slotsGenerated).toBe(1);
      expect(json.stats.conflicts).toBe(0);
      expect(json.conflicts).toEqual([]);

      const savedSlots = await prisma.timetableSlot.findMany({ where: { academicYearId: academicYear.id } });
      expect(savedSlots).toHaveLength(1);
      expect(savedSlots[0]).toMatchObject({
        classId: testClass.id,
        subjectId: subject.id,
        teacherId: slotTeacher.teacherProfile!.id,
      });
    });
  });

  describe("swap", () => {
    it("swaps two slots' day/period/time, and rejects a plain TEACHER", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject();
      const teacherUser = await createTestUser({ role: Role.TEACHER });

      const slotA = await prisma.timetableSlot.create({
        data: {
          classId: testClass.id,
          subjectId: subject.id,
          teacherId: teacherUser.teacherProfile!.id,
          academicYearId: academicYear.id,
          dayOfWeek: DayOfWeek.MONDAY,
          periodNumber: 1,
          startTime: "07:00",
          endTime: "07:40",
        },
      });
      const slotB = await prisma.timetableSlot.create({
        data: {
          classId: testClass.id,
          subjectId: subject.id,
          teacherId: teacherUser.teacherProfile!.id,
          academicYearId: academicYear.id,
          dayOfWeek: DayOfWeek.TUESDAY,
          periodNumber: 2,
          startTime: "07:40",
          endTime: "08:20",
        },
      });

      const denied = await callRoute(swapSlots, {
        method: "POST",
        url: "/api/admin/timetable/swap",
        token: teacherToken,
        body: { slotId: slotA.id, targetSlotId: slotB.id },
      });
      expect(denied.status).toBe(403);

      const { status, json } = await callRoute<{ success: boolean }>(swapSlots, {
        method: "POST",
        url: "/api/admin/timetable/swap",
        token: adminToken,
        body: { slotId: slotA.id, targetSlotId: slotB.id },
      });
      expect(status).toBe(200);
      expect(json.success).toBe(true);

      const [refreshedA, refreshedB] = await Promise.all([
        prisma.timetableSlot.findUniqueOrThrow({ where: { id: slotA.id } }),
        prisma.timetableSlot.findUniqueOrThrow({ where: { id: slotB.id } }),
      ]);
      expect(refreshedA.dayOfWeek).toBe(DayOfWeek.TUESDAY);
      expect(refreshedA.periodNumber).toBe(2);
      expect(refreshedB.dayOfWeek).toBe(DayOfWeek.MONDAY);
      expect(refreshedB.periodNumber).toBe(1);
    });

    it("400s when slotId is missing", async () => {
      const { status } = await callRoute(swapSlots, {
        method: "POST",
        url: "/api/admin/timetable/swap",
        token: adminToken,
        body: {},
      });
      expect(status).toBe(400);
    });
  });

  describe("export-pdf", () => {
    it("404s with no active academic year, and rejects a plain TEACHER once one exists", async () => {
      const noYear = await callRoute(exportPdf, { url: "/api/admin/timetable/export-pdf", token: adminToken });
      expect(noYear.status).toBe(404);

      await createTestAcademicYear();

      const denied = await callRoute(exportPdf, { url: "/api/admin/timetable/export-pdf", token: teacherToken });
      expect(denied.status).toBe(403);
    });

    it("renders a real, non-empty PDF for a class with a seeded timetable slot", async () => {
      const academicYear = await createTestAcademicYear();
      await createTestTimetableConfiguration(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject();
      const slotTeacher = await createTestUser({ role: Role.TEACHER });
      await prisma.timetableSlot.create({
        data: {
          classId: testClass.id,
          subjectId: subject.id,
          teacherId: slotTeacher.teacherProfile!.id,
          academicYearId: academicYear.id,
          dayOfWeek: DayOfWeek.MONDAY,
          periodNumber: 1,
          startTime: "07:00",
          endTime: "07:40",
        },
      });

      const { status, contentType, byteLength } = await callRoute(exportPdf, {
        url: `/api/admin/timetable/export-pdf?classId=${testClass.id}`,
        token: adminToken,
      });

      expect(status).toBe(200);
      expect(contentType).toBe("application/pdf");
      expect(byteLength).toBeGreaterThan(0);
    });
  });
});
