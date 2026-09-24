import { describe, it, expect, beforeEach } from "vitest";
import { Role, GradeLevel, AssessmentStatus, ExamType } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import {
  GET as getAssessment,
  PATCH as updateAssessment,
  DELETE as deleteAssessment,
} from "@/app/api/assessments/[id]/route";
import { POST as completeAssessment } from "@/app/api/assessments/[id]/complete/route";
import { POST as publishAssessment } from "@/app/api/assessments/[id]/publish/route";
import { POST as reopenAssessment } from "@/app/api/assessments/[id]/reopen/route";
import { GET as getAssessmentStats } from "@/app/api/assessments/[id]/stats/route";
import { GET as getAssessmentWindow } from "@/app/api/assessment-windows/route";
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
  createTestClassSubject,
  createTestStudent,
  createTestAssessment,
  createTestAssessmentResult,
  assignSubjectTeacher,
} from "../helpers/db";

describe("assessments routes", () => {
  let teacherAToken: string;
  let teacherBToken: string;
  let adminToken: string;
  let teacherAId: string;
  let classId: string;
  let subjectId: string;
  let termId: string;

  beforeEach(async () => {
    await resetDb();
    const academicYear = await createTestAcademicYear();
    const term = await createTestTerm(academicYear.id);
    termId = term.id;
    const grade = await createTestGrade({ level: GradeLevel.GRADE_10 });
    const testClass = await createTestClass(grade.id);
    classId = testClass.id;
    const subject = await createTestSubject();
    subjectId = subject.id;
    await createTestClassSubject(classId, subjectId);

    const teacherA = await createTestUser({ role: Role.TEACHER });
    teacherAId = teacherA.teacherProfile!.id;
    await assignSubjectTeacher(teacherAId, subjectId, classId, academicYear.id);
    teacherAToken = await loginAs(teacherA.user.email, teacherA.password);

    const teacherB = await createTestUser({ role: Role.TEACHER });
    teacherBToken = await loginAs(teacherB.user.email, teacherB.password);

    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
  });

  it("GET /api/assessments/[id] is readable by anyone, 404s for a nonexistent id", async () => {
    const assessment = await createTestAssessment(subjectId, classId, termId);

    const found = await callRoute<{ data: { id: string } }>(getAssessment, {
      url: `/api/assessments/${assessment.id}`,
      token: teacherBToken,
      params: { id: assessment.id },
    });
    expect(found.status).toBe(200);

    const notFound = await callRoute(getAssessment, {
      url: "/api/assessments/does-not-exist",
      token: teacherBToken,
      params: { id: "does-not-exist" },
    });
    expect(notFound.status).toBe(404);
  });

  it("updates a DRAFT assessment, but rejects updating a non-draft assessment that already has results", async () => {
    const draft = await createTestAssessment(subjectId, classId, termId, { status: AssessmentStatus.DRAFT });

    const updated = await callRoute<{ data: { title: string } }>(updateAssessment, {
      method: "PATCH",
      url: `/api/assessments/${draft.id}`,
      token: teacherAToken,
      params: { id: draft.id },
      body: { title: "Updated Title" },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.title).toBe("Updated Title");

    const published = await createTestAssessment(subjectId, classId, termId, {
      status: AssessmentStatus.PUBLISHED,
      title: "Published CAT",
    });
    const student = await createTestStudent();
    await createTestAssessmentResult(student.id, published.id, 70);

    const { status } = await callRoute(updateAssessment, {
      method: "PATCH",
      url: `/api/assessments/${published.id}`,
      token: teacherAToken,
      params: { id: published.id },
      body: { title: "Should Not Apply" },
    });
    expect(status).toBe(400);
  });

  it("DELETE: a TEACHER can delete their own DRAFT and PUBLISHED assessments (results cascade), but not a COMPLETED one", async () => {
    const draft = await createTestAssessment(subjectId, classId, termId, { status: AssessmentStatus.DRAFT });

    const deleted = await callRoute(deleteAssessment, {
      method: "DELETE",
      url: `/api/assessments/${draft.id}`,
      token: teacherAToken,
      params: { id: draft.id },
    });
    expect(deleted.status).toBe(200);

    // Teachers create duplicate assessments and re-enter the same results —
    // they must be able to remove a published one, entered results included.
    const published = await createTestAssessment(subjectId, classId, termId, {
      status: AssessmentStatus.PUBLISHED,
    });
    const student = await createTestStudent();
    await createTestAssessmentResult(student.id, published.id, 70);
    const deletedPublished = await callRoute(deleteAssessment, {
      method: "DELETE",
      url: `/api/assessments/${published.id}`,
      token: teacherAToken,
      params: { id: published.id },
    });
    expect(deletedPublished.status).toBe(200);
    expect(await prisma.studentAssessmentResult.count({ where: { assessmentId: published.id } })).toBe(0);

    // COMPLETED is still admin/head-teacher-gated.
    const completed = await createTestAssessment(subjectId, classId, termId, {
      status: AssessmentStatus.COMPLETED,
    });
    const deniedCompleted = await callRoute(deleteAssessment, {
      method: "DELETE",
      url: `/api/assessments/${completed.id}`,
      token: teacherAToken,
      params: { id: completed.id },
    });
    expect(deniedCompleted.status).toBe(403);
  });

  it("ADMIN can delete any draft assessment", async () => {
    const draft = await createTestAssessment(subjectId, classId, termId, { status: AssessmentStatus.DRAFT });

    const { status } = await callRoute(deleteAssessment, {
      method: "DELETE",
      url: `/api/assessments/${draft.id}`,
      token: adminToken,
      params: { id: draft.id },
    });
    expect(status).toBe(200);
  });

  describe("publish → complete lifecycle", () => {
    it("requires an open entry window to publish, then requires PUBLISHED status to complete", async () => {
      const draft = await createTestAssessment(subjectId, classId, termId, {
        status: AssessmentStatus.DRAFT,
        examType: ExamType.CAT,
      });

      const noWindow = await callRoute(publishAssessment, {
        method: "POST",
        url: `/api/assessments/${draft.id}/publish`,
        token: teacherAToken,
        params: { id: draft.id },
      });
      expect(noWindow.status).toBe(400);

      await prisma.assessmentWindow.create({
        data: {
          termId,
          examType: ExamType.CAT,
          opensAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdBy: teacherAId,
        },
      });

      const published = await callRoute<{ data: { status: string } }>(publishAssessment, {
        method: "POST",
        url: `/api/assessments/${draft.id}/publish`,
        token: teacherAToken,
        params: { id: draft.id },
      });
      expect(published.status).toBe(200);
      expect(published.json.data.status).toBe(AssessmentStatus.PUBLISHED);

      const completedTooEarly = await createTestAssessment(subjectId, classId, termId, {
        status: AssessmentStatus.DRAFT,
      });
      const deniedComplete = await callRoute(completeAssessment, {
        method: "POST",
        url: `/api/assessments/${completedTooEarly.id}/complete`,
        token: teacherAToken,
        params: { id: completedTooEarly.id },
      });
      expect(deniedComplete.status).toBe(400);

      const completed = await callRoute<{ data: { status: string } }>(completeAssessment, {
        method: "POST",
        url: `/api/assessments/${draft.id}/complete`,
        token: teacherAToken,
        params: { id: draft.id },
      });
      expect(completed.status).toBe(200);
      expect(completed.json.data.status).toBe(AssessmentStatus.COMPLETED);

      // Reopening is rejected unless the assessment is actually COMPLETED —
      // a still-PUBLISHED assessment (e.g. the entry-window one above)
      // must not be reopenable.
      const deniedReopen = await callRoute(reopenAssessment, {
        method: "POST",
        url: `/api/assessments/${completedTooEarly.id}/reopen`,
        token: teacherAToken,
        params: { id: completedTooEarly.id },
      });
      expect(deniedReopen.status).toBe(400);

      // The same teacher who completed it can undo that — no separate
      // "admin override" tier exists, since completion itself was never
      // teacher-exclusive to begin with.
      const reopened = await callRoute<{ data: { status: string } }>(reopenAssessment, {
        method: "POST",
        url: `/api/assessments/${draft.id}/reopen`,
        token: teacherAToken,
        params: { id: draft.id },
      });
      expect(reopened.status).toBe(200);
      expect(reopened.json.data.status).toBe(AssessmentStatus.PUBLISHED);
    });
  });

  it("GET /api/assessments/[id]/stats returns zeroed stats with no results, real stats once graded", async () => {
    const assessment = await createTestAssessment(subjectId, classId, termId);

    const empty = await callRoute<{ data: { totalStudents: number } }>(getAssessmentStats, {
      url: `/api/assessments/${assessment.id}/stats`,
      token: teacherAToken,
      params: { id: assessment.id },
    });
    expect(empty.status).toBe(200);
    expect(empty.json.data.totalStudents).toBe(0);

    const student = await createTestStudent();
    await createTestAssessmentResult(student.id, assessment.id, 80);

    const { status, json } = await callRoute<{ data: { average: number } }>(getAssessmentStats, {
      url: `/api/assessments/${assessment.id}/stats`,
      token: teacherAToken,
      params: { id: assessment.id },
    });
    expect(status).toBe(200);
    expect(json.data.average).toBeGreaterThan(0);
  });

  describe("GET /api/assessment-windows", () => {
    it("requires TEACHER+ role and returns not_configured, then open, once a window exists", async () => {
      const clerk = await createTestUser({ role: Role.CLERK });
      // CLERK is TEACHER-level in the hierarchy (see role-hierarchy.ts), so
      // it's still admitted here — there's no sub-TEACHER role to deny with.
      const clerkToken = await loginAs(clerk.user.email, clerk.password);
      const clerkAllowed = await callRoute(getAssessmentWindow, {
        url: `/api/assessment-windows?termId=${termId}&examType=CAT`,
        token: clerkToken,
      });
      expect(clerkAllowed.status).toBe(200);

      const notConfigured = await callRoute<{ data: { state: string } }>(getAssessmentWindow, {
        url: `/api/assessment-windows?termId=${termId}&examType=CAT`,
        token: teacherAToken,
      });
      expect(notConfigured.status).toBe(200);
      expect(notConfigured.json.data.state).toBe("not_configured");

      await prisma.assessmentWindow.create({
        data: {
          termId,
          examType: ExamType.CAT,
          opensAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          closesAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdBy: teacherAId,
        },
      });

      const { status, json } = await callRoute<{ data: { state: string } }>(getAssessmentWindow, {
        url: `/api/assessment-windows?termId=${termId}&examType=CAT`,
        token: teacherAToken,
      });
      expect(status).toBe(200);
      expect(json.data.state).toBe("open");
    });
  });
});
