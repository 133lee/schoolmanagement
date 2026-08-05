import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as listSubjects, POST as createSubject } from "@/app/api/subjects/route";
import {
  GET as getSubject,
  PATCH as updateSubject,
  DELETE as deleteSubject,
} from "@/app/api/subjects/[id]/route";
import { GET as getSubjectAssignments } from "@/app/api/subjects/[id]/assignments/route";
import { GET as getSubjectUsage } from "@/app/api/subjects/[id]/usage/route";
import { POST as importSubjects } from "@/app/api/subjects/import/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestSubject,
  createTestClass,
  createTestGrade,
  createTestAcademicYear,
  assignSubjectTeacher,
} from "../helpers/db";

describe("subjects routes", () => {
  let adminToken: string;
  let headTeacherToken: string;
  let teacherToken: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const headTeacher = await createTestUser({ role: Role.HEAD_TEACHER });
    headTeacherToken = await loginAs(headTeacher.user.email, headTeacher.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
  });

  it("supports the full create/list/get/update lifecycle for ADMIN/HEAD_TEACHER, rejects TEACHER create/delete", async () => {
    const denied = await callRoute(createSubject, {
      method: "POST",
      url: "/api/subjects",
      token: teacherToken,
      body: { name: "Biology", code: "BIO" },
    });
    expect(denied.status).toBe(403);

    const created = await callRoute<{ data: { id: string; name: string } }>(createSubject, {
      method: "POST",
      url: "/api/subjects",
      token: headTeacherToken,
      body: { name: "Biology", code: "BIO" },
    });
    expect(created.status).toBe(201);
    const subjectId = created.json.data.id;

    const list = await callRoute<{ data: { id: string }[] }>(listSubjects, {
      url: "/api/subjects",
      token: teacherToken,
    });
    expect(list.status).toBe(200);
    expect(list.json.data.map((s) => s.id)).toContain(subjectId);

    const fetched = await callRoute<{ data: { id: string } }>(getSubject, {
      url: `/api/subjects/${subjectId}`,
      token: teacherToken,
      params: { id: subjectId },
    });
    expect(fetched.status).toBe(200);

    const updated = await callRoute<{ data: { name: string } }>(updateSubject, {
      method: "PATCH",
      url: `/api/subjects/${subjectId}`,
      token: headTeacherToken,
      params: { id: subjectId },
      body: { name: "Biology II" },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.name).toBe("Biology II");

    const deniedDelete = await callRoute(deleteSubject, {
      method: "DELETE",
      url: `/api/subjects/${subjectId}`,
      token: headTeacherToken,
      params: { id: subjectId },
    });
    expect(deniedDelete.status).toBe(403);

    const deleted = await callRoute(deleteSubject, {
      method: "DELETE",
      url: `/api/subjects/${subjectId}`,
      token: adminToken,
      params: { id: subjectId },
    });
    expect(deleted.status).toBe(200);
  });

  it("GET /api/subjects/[id]/assignments returns assignments for the subject", async () => {
    const subject = await createTestSubject();

    const { status, json } = await callRoute<{ data: unknown[] }>(getSubjectAssignments, {
      url: `/api/subjects/${subject.id}/assignments`,
      token: teacherToken,
      params: { id: subject.id },
    });
    expect(status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("GET /api/subjects/[id]/usage returns a bare (non-enveloped) usage object", async () => {
    const subject = await createTestSubject();
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    const academicYear = await createTestAcademicYear();
    const teacher = await createTestUser({ role: Role.TEACHER });
    await assignSubjectTeacher(teacher.teacherProfile!.id, subject.id, testClass.id, academicYear.id);

    const { status, json } = await callRoute<{ isInUse: boolean; hasTeachers: boolean }>(getSubjectUsage, {
      url: `/api/subjects/${subject.id}/usage`,
      token: teacherToken,
      params: { id: subject.id },
    });
    expect(status).toBe(200);
    // Bare shape — no ApiResponse envelope, matches edit-subject-dialog.tsx
    // reading usage.isInUse directly.
    expect(json.isInUse).toBe(true);
  });

  describe("POST /api/subjects/import", () => {
    it("imports valid rows and reports errors for rows missing required fields", async () => {
      const { status, json } = await callRoute<{
        data: { successful: number; failed: number; errors: unknown[] };
      }>(importSubjects, {
        method: "POST",
        url: "/api/subjects/import",
        token: headTeacherToken,
        body: {
          rows: [
            { name: "Chemistry", code: "CHEM" },
            { name: "", code: "" },
          ],
        },
      });
      expect(status).toBe(200);
      expect(json.data.successful).toBe(1);
      expect(json.data.failed).toBe(1);
    });

    it("rejects import from a TEACHER", async () => {
      const { status } = await callRoute(importSubjects, {
        method: "POST",
        url: "/api/subjects/import",
        token: teacherToken,
        body: { rows: [{ name: "Chemistry", code: "CHEM" }] },
      });
      expect(status).toBe(403);
    });
  });
});
