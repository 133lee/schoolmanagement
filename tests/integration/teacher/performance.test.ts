import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as getStudentPerformance } from "@/app/api/teacher/students/[studentId]/performance/route";
import { GET as getSubjectPerformance } from "@/app/api/teacher/subject-performance/route";
import { GET as getGradebookAnalysis } from "@/app/api/teacher/gradebook/analysis/route";
import { POST as postAcademicPolicy } from "@/app/api/admin/settings/academic-policy/route";
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
  assignClassTeacher,
  assignSubjectTeacher,
  createTestAssessment,
  createTestAssessmentResult,
} from "../../helpers/db";

describe("teacher performance & gradebook", () => {
  let teacher: Awaited<ReturnType<typeof createTestUser>>;
  let teacherToken: string;
  let outsiderToken: string;

  beforeEach(async () => {
    await resetDb();
    teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
    const outsider = await createTestUser({ role: Role.TEACHER });
    outsiderToken = await loginAs(outsider.user.email, outsider.password);
  });

  describe("GET /api/teacher/students/[studentId]/performance", () => {
    it("requires assessmentType+termId, validates the type, and enforces class access", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(teacher.teacherProfile!.id, testClass.id, academicYear.id);
      const student = await createTestStudent();
      await enrollTestStudent(student.id, testClass.id, academicYear.id);

      const missingParams = await callRoute(getStudentPerformance, {
        url: `/api/teacher/students/${student.id}/performance`,
        token: teacherToken,
        params: { studentId: student.id },
      });
      expect(missingParams.status).toBe(400);

      const badType = await callRoute(getStudentPerformance, {
        url: `/api/teacher/students/${student.id}/performance?assessmentType=BAD&termId=${term.id}`,
        token: teacherToken,
        params: { studentId: student.id },
      });
      expect(badType.status).toBe(400);

      const denied = await callRoute(getStudentPerformance, {
        url: `/api/teacher/students/${student.id}/performance?assessmentType=CAT&termId=${term.id}`,
        token: outsiderToken,
        params: { studentId: student.id },
      });
      expect(denied.status).toBe(403);

      const { status } = await callRoute(getStudentPerformance, {
        url: `/api/teacher/students/${student.id}/performance?assessmentType=CAT&termId=${term.id}`,
        token: teacherToken,
        params: { studentId: student.id },
      });
      expect(status).toBe(200);
    });

    it("computes real radar/class-position data from seeded assessment results", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(teacher.teacherProfile!.id, testClass.id, academicYear.id);
      const subject = await createTestSubject({ name: "Mathematics" });
      const student = await createTestStudent();
      await enrollTestStudent(student.id, testClass.id, academicYear.id);

      const assessment = await createTestAssessment(subject.id, testClass.id, term.id, {
        examType: "CAT",
        totalMarks: 100,
      });
      await createTestAssessmentResult(student.id, assessment.id, 80);

      const { status, json } = await callRoute<{
        data: {
          radarChartData: { subject: string; score: number }[];
          classPosition: number | null;
          classTotal: number;
        };
      }>(getStudentPerformance, {
        url: `/api/teacher/students/${student.id}/performance?assessmentType=CAT&termId=${term.id}`,
        token: teacherToken,
        params: { studentId: student.id },
      });

      expect(status).toBe(200);
      expect(json.data.radarChartData).toEqual([{ subject: "Mathematics", score: 80 }]);
      // Only student in the class -> sole position.
      expect(json.data.classPosition).toBe(1);
      expect(json.data.classTotal).toBe(1);
    });
  });

  describe("GET /api/teacher/subject-performance", () => {
    it("requires subjectId+termId and enforces subject-teacher access", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject();
      await assignSubjectTeacher(teacher.teacherProfile!.id, subject.id, testClass.id, academicYear.id);

      const missingParams = await callRoute(getSubjectPerformance, {
        url: "/api/teacher/subject-performance",
        token: teacherToken,
      });
      expect(missingParams.status).toBe(400);

      const denied = await callRoute(getSubjectPerformance, {
        url: `/api/teacher/subject-performance?subjectId=${subject.id}&termId=${term.id}`,
        token: outsiderToken,
      });
      expect(denied.status).toBe(403);

      const { status } = await callRoute(getSubjectPerformance, {
        url: `/api/teacher/subject-performance?subjectId=${subject.id}&termId=${term.id}`,
        token: teacherToken,
      });
      expect(status).toBe(200);
    });

    it("ranks students within an assessment by score, highest first", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject();
      await assignSubjectTeacher(teacher.teacherProfile!.id, subject.id, testClass.id, academicYear.id);

      const topStudent = await createTestStudent({ firstName: "Top" });
      const secondStudent = await createTestStudent({ firstName: "Second" });
      await enrollTestStudent(topStudent.id, testClass.id, academicYear.id);
      await enrollTestStudent(secondStudent.id, testClass.id, academicYear.id);

      const assessment = await createTestAssessment(subject.id, testClass.id, term.id, {
        examType: "CAT",
        totalMarks: 100,
      });
      await createTestAssessmentResult(topStudent.id, assessment.id, 90);
      await createTestAssessmentResult(secondStudent.id, assessment.id, 60);

      const { status, json } = await callRoute<{
        data: { students: { studentId: string; assessments: { score: number; rank: number; total: number }[] }[] };
      }>(getSubjectPerformance, {
        url: `/api/teacher/subject-performance?subjectId=${subject.id}&classId=${testClass.id}&termId=${term.id}`,
        token: teacherToken,
      });

      expect(status).toBe(200);
      expect(json.data.students).toHaveLength(2);

      const top = json.data.students.find((s) => s.studentId === topStudent.id)!;
      const second = json.data.students.find((s) => s.studentId === secondStudent.id)!;

      expect(top.assessments[0]).toMatchObject({ score: 90, rank: 1, total: 2 });
      expect(second.assessments[0]).toMatchObject({ score: 60, rank: 2, total: 2 });
    });
  });

  describe("GET /api/teacher/gradebook/analysis", () => {
    it("enforces class access (regression coverage for the missing check found and fixed in this pass)", async () => {
      const academicYear = await createTestAcademicYear();
      await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject();
      await assignSubjectTeacher(teacher.teacherProfile!.id, subject.id, testClass.id, academicYear.id);

      const denied = await callRoute(getGradebookAnalysis, {
        url: `/api/teacher/gradebook/analysis?subjectId=${subject.id}&classId=${testClass.id}`,
        token: outsiderToken,
      });
      expect(denied.status).toBe(403);

      const { status } = await callRoute(getGradebookAnalysis, {
        url: `/api/teacher/gradebook/analysis?subjectId=${subject.id}&classId=${testClass.id}`,
        token: teacherToken,
      });
      expect(status).toBe(200);
    });

    it("computes real totals/pass-rate numbers from seeded students and results", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject();
      await assignSubjectTeacher(teacher.teacherProfile!.id, subject.id, testClass.id, academicYear.id);

      const passingStudent = await createTestStudent({ firstName: "Pass", gender: "MALE" });
      const failingStudent = await createTestStudent({ firstName: "Fail", gender: "FEMALE" });
      const unassessedStudent = await createTestStudent({ firstName: "Unassessed", gender: "MALE" });
      await enrollTestStudent(passingStudent.id, testClass.id, academicYear.id);
      await enrollTestStudent(failingStudent.id, testClass.id, academicYear.id);
      await enrollTestStudent(unassessedStudent.id, testClass.id, academicYear.id);

      const assessment = await createTestAssessment(subject.id, testClass.id, term.id, {
        examType: "CAT",
        totalMarks: 100,
      });
      // Passing threshold here is 40% of totalMarks, not 50 — see teacher-gradebook.service.ts.
      await createTestAssessmentResult(passingStudent.id, assessment.id, 80);
      await createTestAssessmentResult(failingStudent.id, assessment.id, 30);
      // unassessedStudent has no result at all.

      const { status, json } = await callRoute<{
        data: {
          totalStudents: { male: number; female: number; total: number };
          recordedEntries: { total: number };
          quantityPass: { passed: number; total: number; rate: number };
        };
      }>(getGradebookAnalysis, {
        url: `/api/teacher/gradebook/analysis?subjectId=${subject.id}&classId=${testClass.id}&termId=${term.id}`,
        token: teacherToken,
      });

      expect(status).toBe(200);
      expect(json.data.totalStudents).toEqual({ male: 2, female: 1, total: 3 });
      expect(json.data.recordedEntries.total).toBe(2); // unassessed student excluded
      expect(json.data.quantityPass).toMatchObject({ passed: 1, total: 2, rate: 50 });
    });

    it("tracks absent students separately and excludes them from recorded/pass-rate/grade stats", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject();
      await assignSubjectTeacher(teacher.teacherProfile!.id, subject.id, testClass.id, academicYear.id);

      const passingStudent = await createTestStudent({ firstName: "Pass", gender: "MALE" });
      const absentStudent = await createTestStudent({ firstName: "Absent", gender: "FEMALE" });
      await enrollTestStudent(passingStudent.id, testClass.id, academicYear.id);
      await enrollTestStudent(absentStudent.id, testClass.id, academicYear.id);

      const assessment = await createTestAssessment(subject.id, testClass.id, term.id, {
        examType: "CAT",
        totalMarks: 100,
      });
      await createTestAssessmentResult(passingStudent.id, assessment.id, 80);
      // AB entries are stored as marksObtained=0, isAbsent=true — this must not
      // be counted as a recorded score or a failing grade.
      await createTestAssessmentResult(absentStudent.id, assessment.id, 0, { isAbsent: true });

      const { status, json } = await callRoute<{
        data: {
          recordedEntries: { male: number; female: number; total: number };
          absentStudents: { male: number; female: number; total: number };
          quantityPass: { passed: number; total: number; rate: number };
        };
      }>(getGradebookAnalysis, {
        url: `/api/teacher/gradebook/analysis?subjectId=${subject.id}&classId=${testClass.id}&termId=${term.id}`,
        token: teacherToken,
      });

      expect(status).toBe(200);
      expect(json.data.recordedEntries).toEqual({ male: 1, female: 0, total: 1 });
      expect(json.data.absentStudents).toEqual({ male: 0, female: 1, total: 1 });
      // Denominator is students who actually sat (1), not enrolled+absent (2).
      expect(json.data.quantityPass).toMatchObject({ passed: 1, total: 1, rate: 100 });
    });

    it("uses the configured academic-policy pass mark, not a hardcoded 40%", async () => {
      const admin = await createTestUser({ role: Role.ADMIN });
      const adminToken = await loginAs(admin.user.email, admin.password);

      // Raise the secondary pass mark to 95% — an 80% score, which would
      // pass under the default 40%, must now fail.
      const policyRes = await callRoute(postAcademicPolicy, {
        method: "POST",
        url: "/api/admin/settings/academic-policy",
        token: adminToken,
        body: { secondary_subject_pass_mark: 95 },
      });
      expect(policyRes.status).toBe(200);

      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade(); // defaults to GRADE_8 -> secondary
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject();
      await assignSubjectTeacher(teacher.teacherProfile!.id, subject.id, testClass.id, academicYear.id);

      const student = await createTestStudent({ firstName: "Near80", gender: "MALE" });
      await enrollTestStudent(student.id, testClass.id, academicYear.id);

      const assessment = await createTestAssessment(subject.id, testClass.id, term.id, {
        examType: "CAT",
        totalMarks: 100,
      });
      await createTestAssessmentResult(student.id, assessment.id, 80);

      const { status, json } = await callRoute<{
        data: { quantityPass: { passed: number; total: number; rate: number } };
      }>(getGradebookAnalysis, {
        url: `/api/teacher/gradebook/analysis?subjectId=${subject.id}&classId=${testClass.id}&termId=${term.id}`,
        token: teacherToken,
      });

      expect(status).toBe(200);
      // Under the default 40% threshold this would be passed:1 — the
      // configured 95% threshold must actually take effect.
      expect(json.data.quantityPass).toMatchObject({ passed: 0, total: 1, rate: 0 });
    });
  });
});
