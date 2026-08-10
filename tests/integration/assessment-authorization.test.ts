import { describe, it, expect, beforeEach } from "vitest";
import { Role, GradeLevel, AssessmentStatus } from "@prisma/client";
import { GET as getAssessments, POST as postAssessment } from "@/app/api/assessments/route";
import { GET as getResults, POST as postResults } from "@/app/api/assessments/[id]/results/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestStudent,
  assignClassTeacher,
  assignSubjectTeacher,
  createTestAssessment,
  createTestAssessmentResult,
  createTestClassSubject,
} from "../helpers/db";

/**
 * Regression coverage for a real gap found this session: assessment
 * list/read/write methods only checked the requester's ROLE (any TEACHER+),
 * never whether they actually teach the specific class+subject. Any teacher
 * account could read, and even overwrite, another teacher's student marks.
 */
describe("assessment authorization — teachers scoped to their own subjects", () => {
  let teacherAToken: string; // actually assigned to the subject/class
  let teacherBToken: string; // a different teacher, no assignment here
  let adminToken: string;
  let classId: string;
  let subjectId: string;
  let termId: string;
  let academicYearId: string;

  beforeEach(async () => {
    await resetDb();

    const academicYear = await createTestAcademicYear();
    academicYearId = academicYear.id;
    const term = await createTestTerm(academicYear.id);
    termId = term.id;
    const grade = await createTestGrade({ level: GradeLevel.GRADE_10 });
    const testClass = await createTestClass(grade.id);
    classId = testClass.id;
    const subject = await createTestSubject({ name: "Mathematics" });
    subjectId = subject.id;
    await createTestClassSubject(classId, subjectId);

    const teacherA = await createTestUser({ role: Role.TEACHER });
    await assignSubjectTeacher(teacherA.teacherProfile!.id, subjectId, classId, academicYear.id);
    teacherAToken = await loginAs(teacherA.user.email, teacherA.password);

    const teacherB = await createTestUser({ role: Role.TEACHER });
    teacherBToken = await loginAs(teacherB.user.email, teacherB.password);

    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
  });

  it("blocks an unrelated teacher from reading another teacher's assessment results, allows the assigned teacher and admin", async () => {
    const assessment = await createTestAssessment(subjectId, classId, termId);
    const student = await createTestStudent();
    await createTestAssessmentResult(student.id, assessment.id, 75);

    const denied = await callRoute(getResults, {
      url: `/api/assessments/${assessment.id}/results`,
      token: teacherBToken,
      params: { id: assessment.id },
    });
    expect(denied.status).toBe(403);

    const allowed = await callRoute(getResults, {
      url: `/api/assessments/${assessment.id}/results`,
      token: teacherAToken,
      params: { id: assessment.id },
    });
    expect(allowed.status).toBe(200);

    const adminAllowed = await callRoute(getResults, {
      url: `/api/assessments/${assessment.id}/results`,
      token: adminToken,
      params: { id: assessment.id },
    });
    expect(adminAllowed.status).toBe(200);
  });

  it("blocks an unrelated teacher from entering results for another teacher's assessment", async () => {
    const assessment = await createTestAssessment(subjectId, classId, termId, { status: AssessmentStatus.PUBLISHED });
    const student = await createTestStudent();

    const denied = await callRoute(postResults, {
      method: "POST",
      url: `/api/assessments/${assessment.id}/results`,
      token: teacherBToken,
      params: { id: assessment.id },
      body: { studentId: student.id, marksObtained: 60 },
    });
    expect(denied.status).toBe(403);

    const allowed = await callRoute(postResults, {
      method: "POST",
      url: `/api/assessments/${assessment.id}/results`,
      token: teacherAToken,
      params: { id: assessment.id },
      body: { studentId: student.id, marksObtained: 60 },
    });
    expect(allowed.status).toBe(201);
  });

  it("persists isAbsent on the single-result POST path (regression: the route silently dropped it, so a teacher's AB auto-save reverted to marksObtained=0 on reload)", async () => {
    const assessment = await createTestAssessment(subjectId, classId, termId, { status: AssessmentStatus.PUBLISHED });
    const student = await createTestStudent();

    const { status, json } = await callRoute<{ data: { id: string; isAbsent: boolean } }>(postResults, {
      method: "POST",
      url: `/api/assessments/${assessment.id}/results`,
      token: teacherAToken,
      params: { id: assessment.id },
      body: { studentId: student.id, marksObtained: 0, isAbsent: true },
    });
    expect(status).toBe(201);
    expect(json.data.isAbsent).toBe(true);

    // Confirm it round-trips correctly on reload too, not just in the create response.
    const fetched = await callRoute<{ data: { isAbsent: boolean; marksObtained: number }[] }>(getResults, {
      url: `/api/assessments/${assessment.id}/results`,
      token: teacherAToken,
      params: { id: assessment.id },
    });
    expect(fetched.json.data.find((r) => r.marksObtained === 0)?.isAbsent).toBe(true);
  });

  it("blocks an unrelated teacher from creating an assessment for a subject/class they don't teach", async () => {
    const denied = await callRoute(postAssessment, {
      method: "POST",
      url: "/api/assessments",
      token: teacherBToken,
      body: { title: "Sneaky CAT", subjectId, classId, termId, examType: "CAT" },
    });
    expect(denied.status).toBe(403);

    const allowed = await callRoute(postAssessment, {
      method: "POST",
      url: "/api/assessments",
      token: teacherAToken,
      body: { title: "Legit CAT", subjectId, classId, termId, examType: "CAT" },
    });
    expect(allowed.status).toBe(201);
  });

  it("excludes assessments for subjects the teacher doesn't teach from their own assessment list", async () => {
    await createTestAssessment(subjectId, classId, termId, { title: "Not Teacher B's" });

    const { status, json } = await callRoute<{ data: Array<{ title: string }> }>(getAssessments, {
      url: `/api/assessments?classId=${classId}&termId=${termId}`,
      token: teacherBToken,
    });
    expect(status).toBe(200);
    expect(json.data).toHaveLength(0);

    const asTeacherA = await callRoute<{ data: Array<{ title: string }> }>(getAssessments, {
      url: `/api/assessments?classId=${classId}&termId=${termId}`,
      token: teacherAToken,
    });
    expect(asTeacherA.status).toBe(200);
    expect(asTeacherA.json.data.map((a) => a.title)).toContain("Not Teacher B's");
  });

  it("lets a class teacher of a PRIMARY-grade class manage assessments for any subject in that class", async () => {
    // Reuses beforeEach's academicYearId/termId — createTestAcademicYear
    // always defaults isActive:true, so a second call here would create two
    // simultaneously-"active" years and desync verifyAssessmentAccess's own
    // findFirst({isActive:true}) lookup from this fixture's assignment.
    const primaryGrade = await createTestGrade({ level: GradeLevel.GRADE_3, sequence: 3 });
    const primaryClass = await createTestClass(primaryGrade.id);

    await createTestClassSubject(primaryClass.id, subjectId);

    const classTeacher = await createTestUser({ role: Role.TEACHER });
    await assignClassTeacher(classTeacher.teacherProfile!.id, primaryClass.id, academicYearId);
    const classTeacherToken = await loginAs(classTeacher.user.email, classTeacher.password);

    // No SubjectTeacherAssignment at all — access should come purely from
    // being the class teacher of a PRIMARY-grade class.
    const { status } = await callRoute(postAssessment, {
      method: "POST",
      url: "/api/assessments",
      token: classTeacherToken,
      body: { title: "Primary CAT", subjectId, classId: primaryClass.id, termId, examType: "CAT" },
    });
    expect(status).toBe(201);
  });
});
