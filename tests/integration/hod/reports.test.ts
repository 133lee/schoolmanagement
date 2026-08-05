import { describe, it, expect, beforeEach } from "vitest";
import { Role, GradeLevel } from "@prisma/client";
import { GET as getClasses } from "@/app/api/hod/reports/classes/route";
import { GET as getGrades } from "@/app/api/hod/reports/grades/route";
import { GET as getPerformance } from "@/app/api/hod/reports/performance/route";
import { GET as getSubjects } from "@/app/api/hod/reports/subjects/route";
import { GET as getTerms } from "@/app/api/hod/reports/terms/route";
import prisma from "@/lib/db/prisma";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import {
  resetDb,
  createHODUser,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestStudent,
  assignTeacherSubject,
  assignSubjectTeacher,
} from "../../helpers/db";

describe("hod/reports", () => {
  let hod: Awaited<ReturnType<typeof createHODUser>>;
  let hodToken: string;
  let outsiderToken: string;

  beforeEach(async () => {
    await resetDb();
    hod = await createHODUser();
    hodToken = await loginAs(hod.user.email, hod.password);
    const outsider = await createTestUser({ role: Role.TEACHER });
    outsiderToken = await loginAs(outsider.user.email, outsider.password);
  });

  describe("GET /api/hod/reports/classes", () => {
    it("returns only classes with a subject from the HOD's own department, not every class in the grade", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const taughtClass = await createTestClass(grade.id, { name: "A" });
      const untaughtClass = await createTestClass(grade.id, { name: "B" });
      const subject = await createTestSubject({ departmentId: hod.department.id });
      await assignSubjectTeacher(hod.teacherProfile!.id, subject.id, taughtClass.id, academicYear.id);

      const denied = await callRoute(getClasses, { url: "/api/hod/reports/classes", token: outsiderToken });
      expect(denied.status).toBe(403);

      const { status, json } = await callRoute<{ data: { classes: { id: string }[] } }>(getClasses, {
        url: `/api/hod/reports/classes?gradeId=${grade.id}`,
        token: hodToken,
      });
      expect(status).toBe(200);
      const returnedIds = json.data.classes.map((c) => c.id);
      // taughtClass has a subject-teacher assignment from the HOD's department
      // (verifyHODClassAccess will later allow it); untaughtClass doesn't
      // (verifyHODClassAccess would 403 it) — the list must not offer a
      // combination that's guaranteed to fail once selected.
      expect(returnedIds).toContain(taughtClass.id);
      expect(returnedIds).not.toContain(untaughtClass.id);
    });
  });

  describe("GET /api/hod/reports/grades", () => {
    it("scopes to secondary grades only (8-12)", async () => {
      const primaryGrade = await createTestGrade({ level: GradeLevel.GRADE_3, sequence: 3 });
      const secondaryGrade = await createTestGrade({ level: GradeLevel.GRADE_9, sequence: 9 });

      const { status, json } = await callRoute<{ data: { grades: { id: string; level: string }[] } }>(
        getGrades,
        { url: "/api/hod/reports/grades", token: hodToken }
      );
      expect(status).toBe(200);
      const ids = json.data.grades.map((g) => g.id);
      expect(ids).toContain(secondaryGrade.id);
      expect(ids).not.toContain(primaryGrade.id);
    });
  });

  describe("GET /api/hod/reports/subjects", () => {
    it("returns only subjects in the HOD's own department", async () => {
      const ownSubject = await createTestSubject({ departmentId: hod.department.id });
      const otherSubject = await createTestSubject();

      const { status, json } = await callRoute<{ data: { subjects: { id: string }[] } }>(getSubjects, {
        url: "/api/hod/reports/subjects",
        token: hodToken,
      });
      expect(status).toBe(200);
      const ids = json.data.subjects.map((s) => s.id);
      expect(ids).toContain(ownSubject.id);
      expect(ids).not.toContain(otherSubject.id);
    });
  });

  describe("GET /api/hod/reports/terms", () => {
    it("returns a display-ready term list", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);

      const { status, json } = await callRoute<{ data: { terms: { id: string }[] } }>(getTerms, {
        url: "/api/hod/reports/terms",
        token: hodToken,
      });
      expect(status).toBe(200);
      expect(json.data.terms.map((t) => t.id)).toContain(term.id);
    });
  });

  describe("GET /api/hod/reports/performance", () => {
    it("requires a class with a subject from the HOD's department, then returns pass/fail stats", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject({ departmentId: hod.department.id });
      await assignTeacherSubject(hod.teacherProfile!.id, subject.id);

      // No subject-teacher assignment linking this class to the department yet.
      const denied = await callRoute(getPerformance, {
        url: `/api/hod/reports/performance?classId=${testClass.id}&termId=${term.id}`,
        token: hodToken,
      });
      expect(denied.status).toBe(403);

      await prisma.subjectTeacherAssignment.create({
        data: {
          teacherId: hod.teacherProfile!.id,
          subjectId: subject.id,
          classId: testClass.id,
          academicYearId: academicYear.id,
        },
      });

      const passingStudent = await createTestStudent({ firstName: "Passing" });
      const failingStudent = await createTestStudent({ firstName: "Failing" });
      await prisma.reportCard.create({
        data: {
          studentId: passingStudent.id,
          classId: testClass.id,
          termId: term.id,
          academicYearId: academicYear.id,
          classTeacherId: hod.teacherProfile!.id,
          averageMark: 70,
        },
      });
      await prisma.reportCard.create({
        data: {
          studentId: failingStudent.id,
          classId: testClass.id,
          termId: term.id,
          academicYearId: academicYear.id,
          classTeacherId: hod.teacherProfile!.id,
          averageMark: 20,
        },
      });

      const { status, json } = await callRoute<{ data: { stats: { totalStudents: number; passRate: number } } }>(
        getPerformance,
        { url: `/api/hod/reports/performance?classId=${testClass.id}&termId=${term.id}`, token: hodToken }
      );
      expect(status).toBe(200);
      expect(json.data.stats.totalStudents).toBe(2);
      expect(json.data.stats.passRate).toBe(50);
    });
  });
});
