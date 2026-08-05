import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as getReports } from "@/app/api/teacher/reports/route";
import { GET as getReportClasses } from "@/app/api/teacher/reports/classes/route";
import { GET as getReportTerms } from "@/app/api/teacher/reports/terms/route";
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
  assignClassTeacher,
} from "../../helpers/db";

describe("teacher/reports", () => {
  let classTeacher: Awaited<ReturnType<typeof createTestUser>>;
  let classTeacherToken: string;
  let outsiderToken: string;

  beforeEach(async () => {
    await resetDb();
    classTeacher = await createTestUser({ role: Role.TEACHER });
    classTeacherToken = await loginAs(classTeacher.user.email, classTeacher.password);
    const outsider = await createTestUser({ role: Role.TEACHER });
    outsiderToken = await loginAs(outsider.user.email, outsider.password);
  });

  describe("GET /api/teacher/reports/classes", () => {
    it("returns the teacher's classes for report viewing", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(classTeacher.teacherProfile!.id, testClass.id, academicYear.id);

      const { status, json } = await callRoute<{ data: { allClasses: { id: string }[] } }>(getReportClasses, {
        url: "/api/teacher/reports/classes",
        token: classTeacherToken,
      });
      expect(status).toBe(200);
      expect(json.data.allClasses.map((c) => c.id)).toContain(testClass.id);
    });
  });

  describe("GET /api/teacher/reports/terms", () => {
    it("returns a display-ready term list", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);

      const { status, json } = await callRoute<{ data: { terms: { id: string }[] } }>(getReportTerms, {
        url: "/api/teacher/reports/terms",
        token: classTeacherToken,
      });
      expect(status).toBe(200);
      expect(json.data.terms.map((t) => t.id)).toContain(term.id);
    });
  });

  describe("GET /api/teacher/reports", () => {
    it("requires classId+termId, rejects an outsider, and returns report cards for the teacher's class", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(classTeacher.teacherProfile!.id, testClass.id, academicYear.id);

      const missingParams = await callRoute(getReports, { url: "/api/teacher/reports", token: classTeacherToken });
      expect(missingParams.status).toBe(400);

      const denied = await callRoute(getReports, {
        url: `/api/teacher/reports?classId=${testClass.id}&termId=${term.id}`,
        token: outsiderToken,
      });
      expect(denied.status).toBe(403);

      const student = await createTestStudent();
      await prisma.reportCard.create({
        data: {
          studentId: student.id,
          classId: testClass.id,
          termId: term.id,
          academicYearId: academicYear.id,
          classTeacherId: classTeacher.teacherProfile!.id,
          averageMark: 65,
        },
      });

      const { status, json } = await callRoute<{ data: { reportCards: { student: { id: string } }[] } }>(
        getReports,
        { url: `/api/teacher/reports?classId=${testClass.id}&termId=${term.id}`, token: classTeacherToken }
      );
      expect(status).toBe(200);
      expect(json.data.reportCards.map((rc) => rc.student.id)).toContain(student.id);
    });
  });
});
