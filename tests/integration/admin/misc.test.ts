import { describe, it, expect, beforeEach } from "vitest";
import { Role, GradeLevel } from "@prisma/client";
import { GET as listWindows, POST as upsertWindow } from "@/app/api/admin/assessment-windows/route";
import { DELETE as deleteWindow } from "@/app/api/admin/assessment-windows/[id]/route";
import { GET as getAttendanceAnalytics } from "@/app/api/admin/attendance/analytics/route";
import { POST as fixGrades } from "@/app/api/admin/fix-grades/route";
import { GET as getProfile, PATCH as patchProfile } from "@/app/api/admin/profile/route";
import { POST as postEmail } from "@/app/api/admin/profile/email/route";
import { POST as postPassword } from "@/app/api/admin/profile/password/route";
import prisma from "@/lib/db/prisma";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestStudent,
  enrollTestStudent,
} from "../../helpers/db";

describe("admin misc: assessment-windows, attendance analytics, fix-grades, profile", () => {
  let adminUser: Awaited<ReturnType<typeof createTestUser>>;
  let adminToken: string;
  let teacherToken: string;

  beforeEach(async () => {
    await resetDb();
    adminUser = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(adminUser.user.email, adminUser.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
  });

  describe("assessment-windows", () => {
    it("supports create/list/delete for ADMIN, rejects TEACHER", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);

      const deniedList = await callRoute(listWindows, { url: "/api/admin/assessment-windows", token: teacherToken });
      expect(deniedList.status).toBe(403);

      const created = await callRoute<{ data: { id: string } }>(upsertWindow, {
        method: "POST",
        url: "/api/admin/assessment-windows",
        token: adminToken,
        body: {
          termId: term.id,
          examType: "CAT",
          opensAt: "2026-01-01T00:00:00.000Z",
          closesAt: "2026-01-31T00:00:00.000Z",
        },
      });
      expect(created.status).toBe(200);
      const windowId = created.json.data.id;

      const list = await callRoute<{ data: { id: string }[] }>(listWindows, {
        url: "/api/admin/assessment-windows",
        token: adminToken,
      });
      expect(list.json.data.map((w) => w.id)).toContain(windowId);

      const deleted = await callRoute(deleteWindow, {
        method: "DELETE",
        url: `/api/admin/assessment-windows/${windowId}`,
        token: adminToken,
        params: { id: windowId },
      });
      expect(deleted.status).toBe(200);
    });
  });

  describe("attendance/analytics", () => {
    it("validates required dates and rejects a plain TEACHER", async () => {
      const missingDates = await callRoute(getAttendanceAnalytics, {
        url: "/api/admin/attendance/analytics",
        token: adminToken,
      });
      expect(missingDates.status).toBe(400);

      const denied = await callRoute(getAttendanceAnalytics, {
        url: "/api/admin/attendance/analytics?startDate=2026-01-01&endDate=2026-01-31",
        token: teacherToken,
      });
      expect(denied.status).toBe(403);

      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const presentStudent = await createTestStudent({ firstName: "Present" });
      const absentStudent = await createTestStudent({ firstName: "Absent" });
      await enrollTestStudent(presentStudent.id, testClass.id, academicYear.id);
      await enrollTestStudent(absentStudent.id, testClass.id, academicYear.id);

      const day = new Date("2026-01-15T00:00:00.000Z");
      await prisma.attendanceRecord.create({
        data: { studentId: presentStudent.id, classId: testClass.id, termId: term.id, date: day, status: "PRESENT" },
      });
      await prisma.attendanceRecord.create({
        data: { studentId: absentStudent.id, classId: testClass.id, termId: term.id, date: day, status: "ABSENT" },
      });

      const { status, json } = await callRoute<{
        data: {
          trend: {
            summary: { totalStudents: number };
            dailyData: { date: string; totalPresent: number; totalAbsent: number; attendanceRate: number }[];
          };
        };
      }>(getAttendanceAnalytics, {
        url: "/api/admin/attendance/analytics?startDate=2026-01-01&endDate=2026-01-31",
        token: adminToken,
      });
      expect(status).toBe(200);
      expect(json.data.trend.summary.totalStudents).toBe(2);

      // dailyData has one entry per day in the requested range (31 days for
      // January), most of them zeroed out — find the one day we seeded records for.
      const seededDay = json.data.trend.dailyData.find((d) => d.date === "2026-01-15");
      expect(seededDay).toMatchObject({ totalPresent: 1, totalAbsent: 1, attendanceRate: 50 });

      const otherDay = json.data.trend.dailyData.find((d) => d.date === "2026-01-16");
      expect(otherDay).toMatchObject({ totalPresent: 0, totalAbsent: 0 });
    });

    describe("per-class breakdown", () => {
      type ClassRow = {
        className: string;
        gradeName: string;
        totalStudents: number;
        totalPresent: number;
        totalAbsent: number;
        attendanceRate: number;
      };
      type BreakdownResponse = { data: { classBreakdown: ClassRow[] | null } };

      // Grade 9 is created BEFORE grade 8 on purpose, and its class first, so
      // a passing ordering assertion can only come from the grade sequence
      // and class name — not from insertion order.
      async function seedTwoGrades() {
        const academicYear = await createTestAcademicYear();
        const term = await createTestTerm(academicYear.id);
        const grade9 = await createTestGrade({ level: GradeLevel.GRADE_9, sequence: 9 });
        const grade8 = await createTestGrade({ level: GradeLevel.GRADE_8, sequence: 8 });
        const class9 = await createTestClass(grade9.id, { name: "A" });
        const class8B = await createTestClass(grade8.id, { name: "B" });
        const class8A = await createTestClass(grade8.id, { name: "A" });

        const day = new Date("2026-01-15T00:00:00.000Z");
        const mark = async (classId: string, name: string, status: "PRESENT" | "ABSENT") => {
          const student = await createTestStudent({ firstName: name });
          await enrollTestStudent(student.id, classId, academicYear.id);
          await prisma.attendanceRecord.create({
            data: { studentId: student.id, classId, termId: term.id, date: day, status },
          });
        };
        await mark(class8A.id, "A1", "PRESENT");
        await mark(class8A.id, "A2", "ABSENT");
        await mark(class8B.id, "B1", "PRESENT");
        await mark(class9.id, "N1", "PRESENT");
        await mark(class9.id, "N2", "PRESENT");

        return { grade8, grade9 };
      }

      const range = "startDate=2026-01-15T00:00:00.000Z&endDate=2026-01-15T23:59:59.000Z";

      it("without a gradeId, covers every active class school-wide, ordered by grade sequence then class name, with each row's gradeName", async () => {
        await seedTwoGrades();

        const { status, json } = await callRoute<BreakdownResponse>(getAttendanceAnalytics, {
          url: `/api/admin/attendance/analytics?${range}&includeClassBreakdown=true`,
          token: adminToken,
        });
        expect(status).toBe(200);

        const rows = json.data.classBreakdown!;
        expect(rows.map((r) => `${r.gradeName} ${r.className}`)).toEqual([
          "Grade 8 A",
          "Grade 8 B",
          "Grade 9 A",
        ]);
        expect(rows[0]).toMatchObject({ totalStudents: 2, totalPresent: 1, totalAbsent: 1, attendanceRate: 50 });
        expect(rows[1]).toMatchObject({ totalStudents: 1, totalPresent: 1, totalAbsent: 0, attendanceRate: 100 });
        expect(rows[2]).toMatchObject({ totalStudents: 2, totalPresent: 2, totalAbsent: 0, attendanceRate: 100 });
      });

      it("with a gradeId, still returns only that grade's classes", async () => {
        const { grade8 } = await seedTwoGrades();

        const { status, json } = await callRoute<BreakdownResponse>(getAttendanceAnalytics, {
          url: `/api/admin/attendance/analytics?${range}&includeClassBreakdown=true&gradeId=${grade8.id}`,
          token: adminToken,
        });
        expect(status).toBe(200);
        expect(json.data.classBreakdown!.map((r) => `${r.gradeName} ${r.className}`)).toEqual([
          "Grade 8 A",
          "Grade 8 B",
        ]);
      });

      it("returns no breakdown unless includeClassBreakdown is requested", async () => {
        await seedTwoGrades();

        const { status, json } = await callRoute<BreakdownResponse>(getAttendanceAnalytics, {
          url: `/api/admin/attendance/analytics?${range}`,
          token: adminToken,
        });
        expect(status).toBe(200);
        expect(json.data.classBreakdown).toBeNull();
      });
    });
  });

  describe("fix-grades", () => {
    it("is ADMIN only and runs cleanly with zero results", async () => {
      const denied = await callRoute(fixGrades, { method: "POST", url: "/api/admin/fix-grades", token: teacherToken });
      expect(denied.status).toBe(403);

      const { status, json } = await callRoute<{ data: { summary: { totalChecked: number; updated: number } } }>(
        fixGrades,
        { method: "POST", url: "/api/admin/fix-grades", token: adminToken }
      );
      expect(status).toBe(200);
      expect(json.data.summary.totalChecked).toBe(0);
      expect(json.data.summary.updated).toBe(0);
    });
  });

  describe("profile", () => {
    it("gets and updates the caller's own profile", async () => {
      const got = await callRoute<{ data: { email: string } }>(getProfile, {
        url: "/api/admin/profile",
        token: adminToken,
      });
      expect(got.status).toBe(200);
      expect(got.json.data.email).toBe(adminUser.user.email);

      const updated = await callRoute<{ data: { profile: { firstName: string } } }>(patchProfile, {
        method: "PATCH",
        url: "/api/admin/profile",
        token: adminToken,
        body: { firstName: "Updated" },
      });
      expect(updated.status).toBe(200);
      expect(updated.json.data.profile.firstName).toBe("Updated");
    });

    it("rejects a password change with the wrong current password", async () => {
      const { status } = await callRoute(postPassword, {
        method: "POST",
        url: "/api/admin/profile/password",
        token: adminToken,
        body: { currentPassword: "wrong-password", newPassword: "NewPassword123!", confirmPassword: "NewPassword123!" },
      });
      expect(status).not.toBe(200);
    });

    it("400s an email change with missing fields", async () => {
      const { status } = await callRoute(postEmail, {
        method: "POST",
        url: "/api/admin/profile/email",
        token: adminToken,
        body: {},
      });
      expect(status).toBe(400);
    });
  });
});
