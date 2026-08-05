import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as getDashboard } from "@/app/api/hod/dashboard/route";
import { GET as getPerformance } from "@/app/api/hod/performance/route";
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
  enrollTestStudent,
  createTestAssessment,
  createTestAssessmentResult,
} from "../../helpers/db";

describe("hod/dashboard & hod/performance", () => {
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

  describe("GET /api/hod/dashboard", () => {
    it("rejects a non-HOD and aggregates department stats for a real HOD", async () => {
      const denied = await callRoute(getDashboard, { url: "/api/hod/dashboard", token: outsiderToken });
      expect(denied.status).toBe(403);

      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject({ departmentId: hod.department.id });
      const student = await createTestStudent();
      await enrollTestStudent(student.id, testClass.id, academicYear.id);
      await prisma.subjectTeacherAssignment.create({
        data: {
          teacherId: hod.teacherProfile!.id,
          subjectId: subject.id,
          classId: testClass.id,
          academicYearId: academicYear.id,
        },
      });

      const assessment = await createTestAssessment(subject.id, testClass.id, term.id, { totalMarks: 100 });
      await createTestAssessmentResult(student.id, assessment.id, 80);

      const { status, json } = await callRoute<{
        data: {
          department: { id: string; totalStudents: number; activeClasses: number };
          performance: { averagePerformance: number; passRate: number };
        };
      }>(getDashboard, { url: "/api/hod/dashboard", token: hodToken });

      expect(status).toBe(200);
      expect(json.data.department.id).toBe(hod.department.id);
      expect(json.data.department.totalStudents).toBe(1);
      expect(json.data.department.activeClasses).toBe(1);
      expect(json.data.performance.averagePerformance).toBe(80);
      expect(json.data.performance.passRate).toBe(100);
    });
  });

  describe("GET /api/hod/performance", () => {
    it("computes averagePerformance/passRate from the department's assessment results", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject({ departmentId: hod.department.id, name: "Physics" });

      const passingStudent = await createTestStudent({ firstName: "Passing" });
      const failingStudent = await createTestStudent({ firstName: "Failing" });
      const assessment = await createTestAssessment(subject.id, testClass.id, term.id, { totalMarks: 100 });
      await createTestAssessmentResult(passingStudent.id, assessment.id, 90);
      await createTestAssessmentResult(failingStudent.id, assessment.id, 30);

      const { status, json } = await callRoute<{
        data: {
          averagePerformance: number;
          passRate: number;
          totalResults: number;
          bestPerformingSubject: { name: string } | null;
        };
      }>(getPerformance, { url: `/api/hod/performance?termId=${term.id}`, token: hodToken });

      expect(status).toBe(200);
      expect(json.data.totalResults).toBe(2);
      expect(json.data.averagePerformance).toBe(60); // (90+30)/2
      expect(json.data.passRate).toBe(50); // 1 of 2 passed
      expect(json.data.bestPerformingSubject?.name).toBe("Physics");
    });
  });
});
