import { describe, it, expect, beforeEach } from "vitest";
import { AssessmentStatus } from "@prisma/client";
import { GET as getAssessmentEntries } from "@/app/api/hod/assessment-entries/route";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import {
  resetDb,
  createHODUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestStudent,
  enrollTestStudent,
  createTestAssessment,
  assignSubjectTeacher,
} from "../../helpers/db";

describe("GET /api/hod/assessment-entries", () => {
  let hod: Awaited<ReturnType<typeof createHODUser>>;
  let hodToken: string;
  let subjectId: string;
  let classId: string;
  let termId: string;

  beforeEach(async () => {
    await resetDb();
    hod = await createHODUser();
    hodToken = await loginAs(hod.user.email, hod.password);

    const academicYear = await createTestAcademicYear();
    const term = await createTestTerm(academicYear.id);
    termId = term.id;
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    classId = testClass.id;
    const subject = await createTestSubject({ departmentId: hod.department.id });
    subjectId = subject.id;

    const student = await createTestStudent();
    await enrollTestStudent(student.id, classId, academicYear.id);
    await assignSubjectTeacher(hod.teacherProfile!.id, subjectId, classId, academicYear.id);
  });

  it("excludes a teacher's DRAFT assessment, but includes it once published", async () => {
    const draft = await createTestAssessment(subjectId, classId, termId, {
      status: "DRAFT",
      title: "Unpublished Draft",
    });

    const withDraft = await callRoute<{
      data: { assessments: Array<{ assessmentId: string }>; stats: { totalAssessments: number } };
    }>(getAssessmentEntries, {
      url: `/api/hod/assessment-entries?termId=${termId}`,
      token: hodToken,
    });
    expect(withDraft.status).toBe(200);
    expect(withDraft.json.data.assessments.some((a) => a.assessmentId === draft.id)).toBe(false);
    expect(withDraft.json.data.stats.totalAssessments).toBe(0);

    // Publishing it should make it appear — same assessment, status flipped.
    const { assessmentRepository } = await import("@/features/assessments/assessment.repository");
    await assessmentRepository.updateStatus(draft.id, AssessmentStatus.PUBLISHED);

    const afterPublish = await callRoute<{
      data: { assessments: Array<{ assessmentId: string }>; stats: { totalAssessments: number } };
    }>(getAssessmentEntries, {
      url: `/api/hod/assessment-entries?termId=${termId}`,
      token: hodToken,
    });
    expect(afterPublish.status).toBe(200);
    expect(afterPublish.json.data.assessments.some((a) => a.assessmentId === draft.id)).toBe(true);
    expect(afterPublish.json.data.stats.totalAssessments).toBe(1);
  });
});
