import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as getClasses } from "@/app/api/admin/reports/classes/route";
import { GET as getGrades } from "@/app/api/admin/reports/grades/route";
import { GET as getPerformance } from "@/app/api/admin/reports/performance/route";
import { GET as getSubjects } from "@/app/api/admin/reports/subjects/route";
import { GET as getTerms } from "@/app/api/admin/reports/terms/route";
import { GET as getSubjectAnalysis } from "@/app/api/admin/reports/subject-analysis/route";
import { POST as postAcademicPolicy } from "@/app/api/admin/settings/academic-policy/route";
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
  createTestSubject,
  createTestStudent,
  enrollTestStudent,
  createTestAssessment,
  createTestAssessmentResult,
} from "../../helpers/db";

describe("admin/reports", () => {
  let adminToken: string;
  let teacherToken: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
  });

  describe("GET /api/admin/reports/classes", () => {
    it("requires ADMIN/HEAD_TEACHER and returns classes for a grade", async () => {
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id, { name: "8A" });

      const denied = await callRoute(getClasses, {
        url: "/api/admin/reports/classes?gradeId=" + grade.id,
        token: teacherToken,
      });
      expect(denied.status).toBe(403);

      const { status, json } = await callRoute<{ data: { classes: { id: string; name: string }[] } }>(
        getClasses,
        { url: "/api/admin/reports/classes?gradeId=" + grade.id, token: adminToken }
      );

      expect(status).toBe(200);
      expect(json.data.classes.map((c) => c.id)).toContain(testClass.id);
    });

    it("400s when gradeId is missing", async () => {
      const { status } = await callRoute(getClasses, { url: "/api/admin/reports/classes", token: adminToken });
      expect(status).toBe(400);
    });
  });

  describe("GET /api/admin/reports/grades", () => {
    it("returns all grades", async () => {
      await createTestGrade();
      const { status, json } = await callRoute<{ data: { grades: unknown[] } }>(getGrades, {
        url: "/api/admin/reports/grades",
        token: adminToken,
      });
      expect(status).toBe(200);
      expect(json.data.grades.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/admin/reports/subjects", () => {
    it("returns all non-deleted subjects", async () => {
      const subject = await createTestSubject({ name: "Mathematics" });
      const { status, json } = await callRoute<{ data: { subjects: { id: string }[] } }>(getSubjects, {
        url: "/api/admin/reports/subjects",
        token: adminToken,
      });
      expect(status).toBe(200);
      expect(json.data.subjects.map((s) => s.id)).toContain(subject.id);
    });
  });

  describe("GET /api/admin/reports/terms", () => {
    it("returns terms with a formatted display name", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);

      const { status, json } = await callRoute<{ data: { terms: { id: string; name: string }[] } }>(
        getTerms,
        { url: "/api/admin/reports/terms", token: adminToken }
      );

      expect(status).toBe(200);
      const found = json.data.terms.find((t) => t.id === term.id);
      expect(found).toBeDefined();
      expect(found!.name).toContain(String(academicYear.year));
    });
  });

  describe("GET /api/admin/reports/performance", () => {
    it("splits students into passed/failed by the 50% mark and computes stats", async () => {
      const admin = await createTestUser({ role: Role.ADMIN });
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);

      const passingStudent = await createTestStudent({ firstName: "Passing" });
      const failingStudent = await createTestStudent({ firstName: "Failing" });

      await prisma.reportCard.create({
        data: {
          studentId: passingStudent.id,
          classId: testClass.id,
          termId: term.id,
          academicYearId: academicYear.id,
          classTeacherId: admin.teacherProfile!.id,
          averageMark: 75,
        },
      });
      await prisma.reportCard.create({
        data: {
          studentId: failingStudent.id,
          classId: testClass.id,
          termId: term.id,
          academicYearId: academicYear.id,
          classTeacherId: admin.teacherProfile!.id,
          averageMark: 30,
        },
      });

      const { status, json } = await callRoute<{
        data: { passed: unknown[]; failed: unknown[]; stats: { totalStudents: number; passRate: number } };
      }>(getPerformance, {
        url: `/api/admin/reports/performance?classId=${testClass.id}&termId=${term.id}`,
        token: adminToken,
      });

      expect(status).toBe(200);
      expect(json.data.passed).toHaveLength(1);
      expect(json.data.failed).toHaveLength(1);
      expect(json.data.stats.totalStudents).toBe(2);
      expect(json.data.stats.passRate).toBe(50);
    });

    it("400s when classId/termId are missing", async () => {
      const { status } = await callRoute(getPerformance, {
        url: "/api/admin/reports/performance",
        token: adminToken,
      });
      expect(status).toBe(400);
    });
  });

  describe("GET /api/admin/reports/subject-analysis", () => {
    it("rejects roles below DEPUTY_HEAD/HEAD_TEACHER/ADMIN", async () => {
      const { status } = await callRoute(getSubjectAnalysis, {
        url: "/api/admin/reports/subject-analysis?gradeId=x&subjectId=y&termId=z",
        token: teacherToken,
      });
      expect(status).toBe(403);
    });

    it("400s when required params are missing", async () => {
      const { status } = await callRoute(getSubjectAnalysis, {
        url: "/api/admin/reports/subject-analysis",
        token: adminToken,
      });
      expect(status).toBe(400);
    });

    it("aggregates real totals/pass-rate across all classes in the grade", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const classA = await createTestClass(grade.id, { name: "A" });
      const classB = await createTestClass(grade.id, { name: "B" });
      const subject = await createTestSubject({ name: "Biology" });

      const studentInA = await createTestStudent({ firstName: "InA", gender: "MALE" });
      const studentInB = await createTestStudent({ firstName: "InB", gender: "FEMALE" });
      await enrollTestStudent(studentInA.id, classA.id, academicYear.id);
      await enrollTestStudent(studentInB.id, classB.id, academicYear.id);

      const assessmentA = await createTestAssessment(subject.id, classA.id, term.id, {
        examType: "CAT",
        totalMarks: 100,
        status: "COMPLETED",
      });
      const assessmentB = await createTestAssessment(subject.id, classB.id, term.id, {
        examType: "CAT",
        totalMarks: 100,
        status: "COMPLETED",
      });
      await createTestAssessmentResult(studentInA.id, assessmentA.id, 90);
      await createTestAssessmentResult(studentInB.id, assessmentB.id, 20);

      const { status, json } = await callRoute<{
        data: {
          totalClasses: number;
          totalStudents: { male: number; female: number; total: number };
          quantityPass: { passed: number; total: number; rate: number };
        };
      }>(getSubjectAnalysis, {
        url: `/api/admin/reports/subject-analysis?gradeId=${grade.id}&subjectId=${subject.id}&termId=${term.id}&assessmentType=CAT`,
        token: adminToken,
      });

      expect(status).toBe(200);
      expect(json.data.totalClasses).toBe(2);
      expect(json.data.totalStudents).toEqual({ male: 1, female: 1, total: 2 });
      // Passing threshold is 40% of totalMarks: 90 passes, 20 fails.
      expect(json.data.quantityPass).toMatchObject({ passed: 1, total: 2, rate: 50 });
    });

    it("uses the configured academic-policy pass mark, not a hardcoded 40%", async () => {
      // Raise the secondary pass mark to 95% — a 90% score, which would pass
      // under the default 40%, must now fail. Proves the calculation reads
      // the saved policy live rather than a hardcoded threshold.
      const policyRes = await callRoute(postAcademicPolicy, {
        method: "POST",
        url: "/api/admin/settings/academic-policy",
        token: adminToken,
        body: { secondary_subject_pass_mark: 95 },
      });
      expect(policyRes.status).toBe(200);

      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade(); // defaults to GRADE_8 -> JUNIOR/secondary
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject({ name: "Chemistry" });

      const student = await createTestStudent({ firstName: "Near90", gender: "MALE" });
      await enrollTestStudent(student.id, testClass.id, academicYear.id);

      const assessment = await createTestAssessment(subject.id, testClass.id, term.id, {
        examType: "CAT",
        totalMarks: 100,
        status: "COMPLETED",
      });
      await createTestAssessmentResult(student.id, assessment.id, 90);

      const { status, json } = await callRoute<{
        data: { quantityPass: { passed: number; total: number; rate: number } };
      }>(getSubjectAnalysis, {
        url: `/api/admin/reports/subject-analysis?gradeId=${grade.id}&subjectId=${subject.id}&termId=${term.id}&assessmentType=CAT`,
        token: adminToken,
      });

      expect(status).toBe(200);
      // Under the default 40% threshold this would be passed:1 — the
      // configured 95% threshold must actually take effect.
      expect(json.data.quantityPass).toMatchObject({ passed: 0, total: 1, rate: 0 });
    });
  });
});
