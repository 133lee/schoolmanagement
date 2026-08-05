import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as getDashboardStats } from "@/app/api/admin/dashboard/stats/route";
import { GET as getDashboardAttendance } from "@/app/api/admin/dashboard/attendance/route";
import { GET as getStudentStats } from "@/app/api/admin/stats/students/route";
import { GET as getTeacherStats } from "@/app/api/admin/stats/teachers/route";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestGrade,
  createTestClass,
  createTestStudent,
  enrollTestStudent,
} from "../../helpers/db";

describe("admin/dashboard & admin/stats", () => {
  let adminToken: string;
  let clerkToken: string;
  let teacherToken: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const clerk = await createTestUser({ role: Role.CLERK });
    clerkToken = await loginAs(clerk.user.email, clerk.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
  });

  describe("GET /api/admin/dashboard/stats", () => {
    it("allows ADMIN and CLERK, counts students/teachers correctly", async () => {
      await createTestStudent();

      const asAdmin = await callRoute<{ data: { students: { total: number }; teachers: { total: number } } }>(
        getDashboardStats,
        { url: "/api/admin/dashboard/stats", token: adminToken }
      );
      expect(asAdmin.status).toBe(200);
      expect(asAdmin.json.data.students.total).toBe(1);
      expect(asAdmin.json.data.teachers.total).toBeGreaterThanOrEqual(1);

      const asClerk = await callRoute(getDashboardStats, { url: "/api/admin/dashboard/stats", token: clerkToken });
      expect(asClerk.status).toBe(200);
    });
  });

  describe("GET /api/admin/dashboard/attendance", () => {
    it("rejects TEACHER and returns rate=0 with no marked records", async () => {
      const denied = await callRoute(getDashboardAttendance, {
        url: "/api/admin/dashboard/attendance",
        token: teacherToken,
      });
      expect(denied.status).toBe(403);

      const { status, json } = await callRoute<{ data: { overall: { marked: number; rate: number } } }>(
        getDashboardAttendance,
        { url: "/api/admin/dashboard/attendance", token: adminToken }
      );
      expect(status).toBe(200);
      expect(json.data.overall.marked).toBe(0);
      expect(json.data.overall.rate).toBe(0);
    });
  });

  describe("GET /api/admin/stats/students", () => {
    it("buckets students by gender and grade", async () => {
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const student = await createTestStudent();
      const academicYear = await createTestAcademicYear();
      await enrollTestStudent(student.id, testClass.id, academicYear.id);

      const { status, json } = await callRoute<{
        data: { total: number; byGender: { MALE: number; FEMALE: number }; byGrade: { name: string; total: number }[] };
      }>(getStudentStats, { url: "/api/admin/stats/students", token: adminToken });

      expect(status).toBe(200);
      expect(json.data.total).toBe(1);
      expect(json.data.byGender.MALE).toBe(1);
      // byGrade entries carry no id (grouped for display), so match by name.
      expect(json.data.byGrade.find((g) => g.name === grade.name)?.total).toBe(1);
    });
  });

  describe("GET /api/admin/stats/teachers", () => {
    it("returns teacher counts by gender", async () => {
      const { status, json } = await callRoute<{ data: { total: number; byGender: { FEMALE: number } } }>(
        getTeacherStats,
        { url: "/api/admin/stats/teachers", token: adminToken }
      );

      expect(status).toBe(200);
      expect(json.data.total).toBeGreaterThanOrEqual(1);
      // createTestUser's teacher fixture is Gender.FEMALE
      expect(json.data.byGender.FEMALE).toBeGreaterThanOrEqual(1);
    });
  });
});
