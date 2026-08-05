import { describe, it, expect, beforeEach } from "vitest";
import { Role, GradeLevel } from "@prisma/client";
import { GET as getGradeLevels } from "@/app/api/grade-levels/route";
import { GET as getTeachingContext } from "@/app/api/user/teaching-context/route";
import { GET as getUsers } from "@/app/api/users/route";
import { GET as getHodSubjectAnalysis } from "@/app/api/hod/reports/subject-analysis/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import {
  resetDb,
  createTestUser,
  createHODUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestGradeSubject,
  assignClassTeacher,
  assignSubjectTeacher,
} from "../helpers/db";

describe("grade-levels, teaching-context, users, hod subject-analysis routes", () => {
  let teacherToken: string;
  let adminToken: string;

  beforeEach(async () => {
    await resetDb();
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
  });

  describe("GET /api/grade-levels", () => {
    it("supports explicit schoolLevel overrides (ALL / PRIMARY / SECONDARY)", async () => {
      await createTestGrade({ level: GradeLevel.GRADE_3, sequence: 3 });
      await createTestGrade({ level: GradeLevel.GRADE_8, sequence: 8 });

      const all = await callRoute<{ data: { level: string }[] }>(getGradeLevels, {
        url: "/api/grade-levels?schoolLevel=ALL",
        token: teacherToken,
      });
      expect(all.status).toBe(200);
      expect(all.json.data.length).toBeGreaterThanOrEqual(2);

      const primaryOnly = await callRoute<{ data: { level: string }[] }>(getGradeLevels, {
        url: "/api/grade-levels?schoolLevel=PRIMARY",
        token: teacherToken,
      });
      expect(primaryOnly.json.data.every((g) => g.level === GradeLevel.GRADE_3)).toBe(true);
    });
  });

  describe("GET /api/user/teaching-context", () => {
    it("reports hasTeachingContext:false with no assignments, true once one exists", async () => {
      const teacher = await createTestUser({ role: Role.TEACHER });
      const token = await loginAs(teacher.user.email, teacher.password);

      const before = await callRoute<{ data: { hasTeachingContext: boolean } }>(getTeachingContext, {
        url: "/api/user/teaching-context",
        token,
      });
      expect(before.status).toBe(200);
      expect(before.json.data.hasTeachingContext).toBe(false);

      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(teacher.teacherProfile!.id, testClass.id, academicYear.id);

      const after = await callRoute<{ data: { hasTeachingContext: boolean } }>(getTeachingContext, {
        url: "/api/user/teaching-context",
        token,
      });
      expect(after.json.data.hasTeachingContext).toBe(true);
    });
  });

  describe("GET /api/users", () => {
    it("is ADMIN-only and supports a role filter", async () => {
      const denied = await callRoute(getUsers, { url: "/api/users", token: teacherToken });
      expect(denied.status).toBe(403);

      const allowed = await callRoute<{ data: { role: string }[] }>(getUsers, {
        url: "/api/users?role=TEACHER",
        token: adminToken,
      });
      expect(allowed.status).toBe(200);
      expect(allowed.json.data.every((u) => u.role === Role.TEACHER)).toBe(true);
    });
  });

  describe("GET /api/hod/reports/subject-analysis", () => {
    it("is scoped like /api/hod/reports/classes: 403s for a class the HOD's department doesn't teach", async () => {
      const hod = await createHODUser();
      const hodToken = await loginAs(hod.user.email, hod.password);

      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject({ departmentId: hod.department.id });
      await createTestGradeSubject(grade.id, subject.id);

      const deniedUntaught = await callRoute(getHodSubjectAnalysis, {
        url: `/api/hod/reports/subject-analysis?subjectId=${subject.id}&classId=${testClass.id}&termId=${term.id}`,
        token: hodToken,
      });
      expect(deniedUntaught.status).toBe(403);

      await assignSubjectTeacher(hod.teacherProfile!.id, subject.id, testClass.id, academicYear.id);

      const allowed = await callRoute<{ data: { totalStudents: { total: number } } }>(
        getHodSubjectAnalysis,
        {
          url: `/api/hod/reports/subject-analysis?subjectId=${subject.id}&classId=${testClass.id}&termId=${term.id}`,
          token: hodToken,
        }
      );
      expect(allowed.status).toBe(200);
      expect(allowed.json.data.totalStudents.total).toBe(0);
    });
  });
});
