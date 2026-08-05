import { describe, it, expect, beforeEach } from "vitest";
import { Role, PromotionStatus } from "@prisma/client";
import { GET as listReportCards, POST as generateReportCard } from "@/app/api/report-cards/route";
import {
  GET as getReportCard,
  PATCH as updateReportCard,
  DELETE as deleteReportCard,
} from "@/app/api/report-cards/[id]/route";
import { POST as bulkGenerate } from "@/app/api/report-cards/bulk/route";
import { POST as calculatePositions } from "@/app/api/report-cards/positions/route";
import { GET as getReportCardPdf } from "@/app/api/report-cards/[id]/pdf/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestStudent,
  createTestSubject,
  createTestClassSubject,
  enrollTestStudent,
} from "../helpers/db";

describe("report-cards routes", () => {
  let teacherToken: string;
  let clerkToken: string;
  let deputyHeadToken: string;
  let adminToken: string;
  let teacherProfileId: string;
  let classId: string;
  let termId: string;

  beforeEach(async () => {
    await resetDb();
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
    teacherProfileId = teacher.teacherProfile!.id;
    const clerk = await createTestUser({ role: Role.CLERK });
    clerkToken = await loginAs(clerk.user.email, clerk.password);
    const deputyHead = await createTestUser({ role: Role.DEPUTY_HEAD });
    deputyHeadToken = await loginAs(deputyHead.user.email, deputyHead.password);
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);

    const academicYear = await createTestAcademicYear();
    const term = await createTestTerm(academicYear.id);
    termId = term.id;
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    classId = testClass.id;
    const subject = await createTestSubject();
    await createTestClassSubject(classId, subject.id);
  });

  it("generates a report card (TEACHER+, which CLERK also satisfies — same hierarchy level) and rejects a duplicate for the same student/term", async () => {
    const student = await createTestStudent();
    await enrollTestStudent(student.id, classId, (await createTestAcademicYear({ year: 3000 })).id);

    // CLERK is the same hierarchy level as TEACHER (both floor level 1 —
    // see ROLE_HIERARCHY in lib/auth/role-hierarchy.ts), so requireMinimumRole
    // TEACHER admits it too; there's no role below that floor to test a 403 with.
    const clerkAllowed = await callRoute(generateReportCard, {
      method: "POST",
      url: "/api/report-cards",
      token: clerkToken,
      body: { studentId: student.id, classId, termId, classTeacherId: teacherProfileId },
    });
    expect(clerkAllowed.status).toBe(201);

    const student2 = await createTestStudent({ firstName: "Second" });
    const created = await callRoute<{ data: { id: string; averageMark: number } }>(generateReportCard, {
      method: "POST",
      url: "/api/report-cards",
      token: teacherToken,
      body: { studentId: student2.id, classId, termId, classTeacherId: teacherProfileId },
    });
    expect(created.status).toBe(201);
    const reportCardId = created.json.data.id;

    const duplicate = await callRoute(generateReportCard, {
      method: "POST",
      url: "/api/report-cards",
      token: teacherToken,
      body: { studentId: student2.id, classId, termId, classTeacherId: teacherProfileId },
    });
    expect(duplicate.status).toBe(400);

    // Full read/update/delete lifecycle on the generated card.
    const list = await callRoute<{ data: { id: string }[] }>(listReportCards, {
      url: `/api/report-cards?classId=${classId}`,
      token: teacherToken,
    });
    expect(list.status).toBe(200);
    expect(list.json.data.map((rc) => rc.id)).toContain(reportCardId);

    const fetched = await callRoute<{ data: { id: string } }>(getReportCard, {
      url: `/api/report-cards/${reportCardId}`,
      token: teacherToken,
      params: { id: reportCardId },
    });
    expect(fetched.status).toBe(200);

    const updated = await callRoute<{ data: { promotionStatus: string } }>(updateReportCard, {
      method: "PATCH",
      url: `/api/report-cards/${reportCardId}`,
      token: teacherToken,
      params: { id: reportCardId },
      body: { promotionStatus: PromotionStatus.PROMOTED },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.promotionStatus).toBe(PromotionStatus.PROMOTED);

    const deniedDelete = await callRoute(deleteReportCard, {
      method: "DELETE",
      url: `/api/report-cards/${reportCardId}`,
      token: teacherToken,
      params: { id: reportCardId },
    });
    expect(deniedDelete.status).toBe(403);

    const deleted = await callRoute(deleteReportCard, {
      method: "DELETE",
      url: `/api/report-cards/${reportCardId}`,
      token: adminToken,
      params: { id: reportCardId },
    });
    expect(deleted.status).toBe(200);
  });

  it("only HEAD_TEACHER remarks require HEAD_TEACHER+, plain remarks work for TEACHER", async () => {
    const student = await createTestStudent();
    const created = await callRoute<{ data: { id: string } }>(generateReportCard, {
      method: "POST",
      url: "/api/report-cards",
      token: teacherToken,
      body: { studentId: student.id, classId, termId, classTeacherId: teacherProfileId },
    });
    const reportCardId = created.json.data.id;

    const deniedHeadRemark = await callRoute(updateReportCard, {
      method: "PATCH",
      url: `/api/report-cards/${reportCardId}`,
      token: teacherToken,
      params: { id: reportCardId },
      body: { headTeacherRemarks: "Great progress" },
    });
    expect(deniedHeadRemark.status).toBe(403);

    const allowedPlainRemark = await callRoute(updateReportCard, {
      method: "PATCH",
      url: `/api/report-cards/${reportCardId}`,
      token: teacherToken,
      params: { id: reportCardId },
      body: { classTeacherRemarks: "Good effort" },
    });
    expect(allowedPlainRemark.status).toBe(200);
  });

  it("bulk-generates report cards for all enrolled students (DEPUTY_HEAD+ only), then calculates positions", async () => {
    const academicYear = await createTestAcademicYear({ year: 3001 });
    const studentA = await createTestStudent({ firstName: "A" });
    const studentB = await createTestStudent({ firstName: "B" });
    await enrollTestStudent(studentA.id, classId, academicYear.id);
    await enrollTestStudent(studentB.id, classId, academicYear.id);

    const denied = await callRoute(bulkGenerate, {
      method: "POST",
      url: "/api/report-cards/bulk",
      token: teacherToken,
      body: { classId, termId, classTeacherId: teacherProfileId },
    });
    expect(denied.status).toBe(403);

    const { status, json } = await callRoute<{ data: { successful: number; failed: unknown[] } }>(
      bulkGenerate,
      {
        method: "POST",
        url: "/api/report-cards/bulk",
        token: deputyHeadToken,
        body: { classId, termId, classTeacherId: teacherProfileId },
      }
    );
    expect(status).toBe(201);
    expect(json.data.successful).toBe(2);

    const positions = await callRoute<{ data: { totalStudents: number; updated: number } }>(
      calculatePositions,
      {
        method: "POST",
        url: "/api/report-cards/positions",
        token: teacherToken,
        body: { classId, termId },
      }
    );
    expect(positions.status).toBe(200);
    expect(positions.json.data.totalStudents).toBe(2);
    expect(positions.json.data.updated).toBe(2);
  });

  describe("GET /api/report-cards/[id]/pdf", () => {
    it("returns 404 for a nonexistent report card", async () => {
      const { status } = await callRoute(getReportCardPdf, {
        url: "/api/report-cards/does-not-exist/pdf",
        token: teacherToken,
        params: { id: "does-not-exist" },
      });
      expect(status).toBe(404);
    });

    it("generates a real PDF for an existing report card", async () => {
      const student = await createTestStudent();
      const created = await callRoute<{ data: { id: string } }>(generateReportCard, {
        method: "POST",
        url: "/api/report-cards",
        token: teacherToken,
        body: { studentId: student.id, classId, termId, classTeacherId: teacherProfileId },
      });
      const reportCardId = created.json.data.id;

      const { status, contentType, byteLength } = await callRoute(getReportCardPdf, {
        url: `/api/report-cards/${reportCardId}/pdf`,
        token: teacherToken,
        params: { id: reportCardId },
      });
      expect(status).toBe(200);
      expect(contentType).toBe("application/pdf");
      expect(byteLength).toBeGreaterThan(0);
    });
  });
});
