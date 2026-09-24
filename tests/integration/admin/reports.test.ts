import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as getClasses } from "@/app/api/admin/reports/classes/route";
import { GET as getGrades } from "@/app/api/admin/reports/grades/route";
import { GET as getPerformance } from "@/app/api/admin/reports/performance/route";
import { GET as getSubjects } from "@/app/api/admin/reports/subjects/route";
import { GET as getTerms } from "@/app/api/admin/reports/terms/route";
import { GET as getSubjectAnalysis } from "@/app/api/admin/reports/subject-analysis/route";
import { GET as getGradePerformance } from "@/app/api/admin/reports/grade-performance/route";
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
  createTestReportCard,
  createTestReportCardSubject,
  createTestClassSubject,
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

    it("with gradeId, requires HEAD_TEACHER/ADMIN and scopes to that grade's own subjects", async () => {
      const gradeA = await createTestGrade({ level: "GRADE_8" });
      const gradeB = await createTestGrade({ level: "GRADE_9", sequence: 9 });
      const classA = await createTestClass(gradeA.id);
      const classB = await createTestClass(gradeB.id);
      const subjectInA = await createTestSubject({ name: "Geography" });
      const subjectInB = await createTestSubject({ name: "Religious Education" });
      await createTestClassSubject(classA.id, subjectInA.id);
      await createTestClassSubject(classB.id, subjectInB.id);

      const denied = await callRoute(getSubjects, {
        url: `/api/admin/reports/subjects?gradeId=${gradeA.id}`,
        token: teacherToken,
      });
      expect(denied.status).toBe(403);

      const { status, json } = await callRoute<{ data: { subjects: { id: string }[] } }>(getSubjects, {
        url: `/api/admin/reports/subjects?gradeId=${gradeA.id}`,
        token: adminToken,
      });
      expect(status).toBe(200);
      const ids = json.data.subjects.map((s) => s.id);
      expect(ids).toContain(subjectInA.id);
      expect(ids).not.toContain(subjectInB.id);
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

      // Grade-level aggregation only pools classes that actually offer this
      // subject (see admin-subject-analysis.service.ts) — without these, a
      // class with an assessment for a subject it isn't formally linked to
      // would be silently excluded from the aggregate.
      await createTestClassSubject(classA.id, subject.id);
      await createTestClassSubject(classB.id, subject.id);

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
      await createTestClassSubject(testClass.id, subject.id);

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

  describe("GET /api/admin/reports/grade-performance", () => {
    it("rejects roles below DEPUTY_HEAD", async () => {
      const { status } = await callRoute(getGradePerformance, {
        url: "/api/admin/reports/grade-performance?gradeId=x&termId=y",
        token: teacherToken,
      });
      expect(status).toBe(403);
    });

    it("400s when gradeId/termId are missing", async () => {
      const { status } = await callRoute(getGradePerformance, {
        url: "/api/admin/reports/grade-performance",
        token: adminToken,
      });
      expect(status).toBe(400);
    });

    it("excludes a student with no marks entered from both SAT and ABSENT, but counts an explicit AB", async () => {
      const admin = await createTestUser({ role: Role.ADMIN });
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade({ level: "GRADE_10" });
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject({ name: "History" });

      const studentWithMark = await createTestStudent({ firstName: "HasMark", gender: "MALE" });
      const studentAbsent = await createTestStudent({ firstName: "MarkedAbsent", gender: "MALE" });
      const studentNoData = await createTestStudent({ firstName: "NoDataYet", gender: "FEMALE" });
      for (const s of [studentWithMark, studentAbsent, studentNoData]) {
        await enrollTestStudent(s.id, testClass.id, academicYear.id);
      }

      const rcWithMark = await createTestReportCard(
        studentWithMark.id, testClass.id, term.id, academicYear.id, admin.teacherProfile!.id
      );
      await createTestReportCardSubject(rcWithMark.id, subject.id, {
        catMark: 80, totalMark: 80, grade: "GRADE_2",
      });

      const rcAbsent = await createTestReportCard(
        studentAbsent.id, testClass.id, term.id, academicYear.id, admin.teacherProfile!.id
      );
      await createTestReportCardSubject(rcAbsent.id, subject.id, { catAbsent: true });

      const rcNoData = await createTestReportCard(
        studentNoData.id, testClass.id, term.id, academicYear.id, admin.teacherProfile!.id
      );
      // Nothing entered at all — the History teacher hasn't marked this
      // exam type yet. Must NOT be treated as an absence.
      await createTestReportCardSubject(rcNoData.id, subject.id, {});

      const { status, json } = await callRoute<{
        data: {
          subjects: Array<{
            subjectName: string;
            entered: { total: number };
            sat: { total: number };
            absent: { total: number };
          }>;
        };
      }>(getGradePerformance, {
        url: `/api/admin/reports/grade-performance?gradeId=${grade.id}&termId=${term.id}`,
        token: adminToken,
      });

      expect(status).toBe(200);
      const row = json.data.subjects.find((s) => s.subjectName === "History");
      expect(row).toBeDefined();
      expect(row!.entered.total).toBe(3);
      expect(row!.sat.total).toBe(1);
      // Must be 1, not 2 — the no-data student is neither sat nor absent.
      expect(row!.absent.total).toBe(1);
    });

    it("merges Physics + Chemistry into one SCIENCE row when a student has a real mark in both (Grade 12 only)", async () => {
      const admin = await createTestUser({ role: Role.ADMIN });
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade({ level: "GRADE_12" });
      const testClass = await createTestClass(grade.id);
      const physics = await createTestSubject({ name: "Physics" });
      const chemistry = await createTestSubject({ name: "Chemistry" });

      const student = await createTestStudent({ firstName: "BothSciences", gender: "MALE" });
      await enrollTestStudent(student.id, testClass.id, academicYear.id);

      const reportCard = await createTestReportCard(
        student.id, testClass.id, term.id, academicYear.id, admin.teacherProfile!.id
      );
      await createTestReportCardSubject(reportCard.id, physics.id, {
        catMark: 80, totalMark: 80, grade: "GRADE_2",
      });
      await createTestReportCardSubject(reportCard.id, chemistry.id, {
        catMark: 60, totalMark: 60, grade: "GRADE_4",
      });

      const { status, json } = await callRoute<{ data: { subjects: Array<{ subjectName: string }> } }>(
        getGradePerformance,
        {
          url: `/api/admin/reports/grade-performance?gradeId=${grade.id}&termId=${term.id}`,
          token: adminToken,
        }
      );

      expect(status).toBe(200);
      const subjectNames = json.data.subjects.map((s) => s.subjectName);
      expect(subjectNames).toContain("SCIENCE");
      expect(subjectNames).not.toContain("Physics");
      expect(subjectNames).not.toContain("Chemistry");
    });

    it("does NOT merge when only one of Physics/Chemistry has a real mark — it stands alone", async () => {
      const admin = await createTestUser({ role: Role.ADMIN });
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade({ level: "GRADE_12" });
      const testClass = await createTestClass(grade.id);
      const physics = await createTestSubject({ name: "Physics" });
      const chemistry = await createTestSubject({ name: "Chemistry" });

      const student = await createTestStudent({ firstName: "PhysicsOnly", gender: "MALE" });
      await enrollTestStudent(student.id, testClass.id, academicYear.id);

      const reportCard = await createTestReportCard(
        student.id, testClass.id, term.id, academicYear.id, admin.teacherProfile!.id
      );
      await createTestReportCardSubject(reportCard.id, physics.id, {
        catMark: 80, totalMark: 80, grade: "GRADE_2",
      });
      // Chemistry teacher hasn't entered anything for this student yet.
      await createTestReportCardSubject(reportCard.id, chemistry.id, {});

      const { status, json } = await callRoute<{ data: { subjects: Array<{ subjectName: string }> } }>(
        getGradePerformance,
        {
          url: `/api/admin/reports/grade-performance?gradeId=${grade.id}&termId=${term.id}`,
          token: adminToken,
        }
      );

      expect(status).toBe(200);
      const subjectNames = json.data.subjects.map((s) => s.subjectName);
      expect(subjectNames).toContain("Physics");
      expect(subjectNames).not.toContain("SCIENCE");
    });

    it("classifies School Certificate / GCE / Fail per the official ECZ rule (English required, no Maths requirement)", async () => {
      const admin = await createTestUser({ role: Role.ADMIN });
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade({ level: "GRADE_12" });
      const testClass = await createTestClass(grade.id);
      const english = await createTestSubject({ name: "English Language" });
      const others = await Promise.all(
        Array.from({ length: 5 }, (_, i) => createTestSubject({ name: `Elective ${i}` }))
      );

      // School Certificate, route "6 passes including English + >=1 credit":
      // English at grade 4 (a credit) + five subjects at grade 7 (a pass,
      // not a credit) = 6 passes, 1 credit, English passed.
      const scStudent = await createTestStudent({ firstName: "CertStudent", gender: "MALE" });
      await enrollTestStudent(scStudent.id, testClass.id, academicYear.id);
      const scCard = await createTestReportCard(
        scStudent.id, testClass.id, term.id, academicYear.id, admin.teacherProfile!.id
      );
      await createTestReportCardSubject(scCard.id, english.id, { catMark: 60, totalMark: 60, grade: "GRADE_4" });
      for (const s of others) {
        await createTestReportCardSubject(scCard.id, s.id, { catMark: 47, totalMark: 47, grade: "GRADE_7" });
      }

      // GCE: only English + 1 elective pass (2 passes total), 0 credits —
      // meets neither School Certificate route, but has at least 1 pass.
      const gceStudent = await createTestStudent({ firstName: "GceStudent", gender: "FEMALE" });
      await enrollTestStudent(gceStudent.id, testClass.id, academicYear.id);
      const gceCard = await createTestReportCard(
        gceStudent.id, testClass.id, term.id, academicYear.id, admin.teacherProfile!.id
      );
      await createTestReportCardSubject(gceCard.id, english.id, { catMark: 47, totalMark: 47, grade: "GRADE_7" });
      await createTestReportCardSubject(gceCard.id, others[0].id, { catMark: 47, totalMark: 47, grade: "GRADE_7" });
      for (const s of others.slice(1)) {
        await createTestReportCardSubject(gceCard.id, s.id, { catMark: 10, totalMark: 10, grade: "GRADE_9" });
      }

      // Fail: grade 9 (Unsatisfactory) in every subject, including English.
      const failStudent = await createTestStudent({ firstName: "FailStudent", gender: "MALE" });
      await enrollTestStudent(failStudent.id, testClass.id, academicYear.id);
      const failCard = await createTestReportCard(
        failStudent.id, testClass.id, term.id, academicYear.id, admin.teacherProfile!.id
      );
      await createTestReportCardSubject(failCard.id, english.id, { catMark: 10, totalMark: 10, grade: "GRADE_9" });
      for (const s of others) {
        await createTestReportCardSubject(failCard.id, s.id, { catMark: 10, totalMark: 10, grade: "GRADE_9" });
      }

      const { status, json } = await callRoute<{
        data: {
          overall: {
            schoolCertificate: { total: number };
            gce: { total: number };
            fail: { total: number };
          };
        };
      }>(getGradePerformance, {
        url: `/api/admin/reports/grade-performance?gradeId=${grade.id}&termId=${term.id}`,
        token: adminToken,
      });

      expect(status).toBe(200);
      expect(json.data.overall.schoolCertificate.total).toBe(1);
      expect(json.data.overall.gce.total).toBe(1);
      expect(json.data.overall.fail.total).toBe(1);
    });
  });
});
