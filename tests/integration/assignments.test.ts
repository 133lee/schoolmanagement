import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as listAssignments, POST as createAssignment } from "@/app/api/assignments/route";
import {
  GET as getAssignment,
  PATCH as updateAssignment,
  DELETE as deleteAssignment,
} from "@/app/api/assignments/[id]/route";
import { POST as bulkAssign } from "@/app/api/assignments/bulk/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestGradeSubject,
  createTestClassSubject,
  assignTeacherSubject,
} from "../helpers/db";

describe("assignments routes", () => {
  let adminToken: string;
  let deputyHeadToken: string;
  let teacherToken: string;
  let teacherProfileId: string;
  let gradeId: string;
  let classId: string;
  let subjectId: string;
  let academicYearId: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const deputyHead = await createTestUser({ role: Role.DEPUTY_HEAD });
    deputyHeadToken = await loginAs(deputyHead.user.email, deputyHead.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
    teacherProfileId = teacher.teacherProfile!.id;

    const academicYear = await createTestAcademicYear();
    academicYearId = academicYear.id;
    const grade = await createTestGrade();
    gradeId = grade.id;
    const testClass = await createTestClass(grade.id);
    classId = testClass.id;
    const subject = await createTestSubject();
    subjectId = subject.id;

    // createAssignment enforces three business rules beyond auth: the
    // teacher must be qualified for the subject (TeacherSubject), the
    // subject must be valid for the grade (GradeSubject), and it must be in
    // the class's curriculum (ClassSubject) — all three are required.
    await assignTeacherSubject(teacherProfileId, subjectId);
    await createTestGradeSubject(gradeId, subjectId);
    await createTestClassSubject(classId, subjectId);
  });

  it("supports the full create/list/get/update/delete lifecycle for DEPUTY_HEAD+, rejects TEACHER create", async () => {
    const denied = await callRoute(createAssignment, {
      method: "POST",
      url: "/api/assignments",
      token: teacherToken,
      body: { teacherId: teacherProfileId, subjectId, classId, academicYearId },
    });
    expect(denied.status).toBe(403);

    const created = await callRoute<{ data: { id: string } }>(createAssignment, {
      method: "POST",
      url: "/api/assignments",
      token: deputyHeadToken,
      body: { teacherId: teacherProfileId, subjectId, classId, academicYearId },
    });
    expect(created.status).toBe(201);
    const assignmentId = created.json.data.id;

    const list = await callRoute<{ data: { id: string }[] }>(listAssignments, {
      url: `/api/assignments?classId=${classId}`,
      token: teacherToken,
    });
    expect(list.status).toBe(200);
    expect(list.json.data.map((a) => a.id)).toContain(assignmentId);

    const fetched = await callRoute<{ data: { id: string } }>(getAssignment, {
      url: `/api/assignments/${assignmentId}`,
      token: teacherToken,
      params: { id: assignmentId },
    });
    expect(fetched.status).toBe(200);

    const otherTeacher = await createTestUser({ role: Role.TEACHER });
    await assignTeacherSubject(otherTeacher.teacherProfile!.id, subjectId);
    const updated = await callRoute<{ data: { teacherId: string } }>(updateAssignment, {
      method: "PATCH",
      url: `/api/assignments/${assignmentId}`,
      token: deputyHeadToken,
      params: { id: assignmentId },
      body: { teacherId: otherTeacher.teacherProfile!.id },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.teacherId).toBe(otherTeacher.teacherProfile!.id);

    // Delete requires ADMIN/HEAD_TEACHER — DEPUTY_HEAD can manage/update but not delete.
    const deniedDelete = await callRoute(deleteAssignment, {
      method: "DELETE",
      url: `/api/assignments/${assignmentId}`,
      token: deputyHeadToken,
      params: { id: assignmentId },
    });
    expect(deniedDelete.status).toBe(403);

    const deleted = await callRoute(deleteAssignment, {
      method: "DELETE",
      url: `/api/assignments/${assignmentId}`,
      token: adminToken,
      params: { id: assignmentId },
    });
    expect(deleted.status).toBe(200);
  });

  describe("POST /api/assignments/bulk", () => {
    it("creates multiple assignments for a class and reports per-assignment failures", async () => {
      const otherSubject = await createTestSubject();

      const { status, json } = await callRoute<{
        data: { successful: number; failed: Array<{ subjectId: string }> };
      }>(bulkAssign, {
        method: "POST",
        url: "/api/assignments/bulk",
        token: deputyHeadToken,
        body: {
          classId,
          academicYearId,
          assignments: [
            { teacherId: teacherProfileId, subjectId },
            { teacherId: "does-not-exist", subjectId: otherSubject.id },
          ],
        },
      });
      expect(status).toBe(201);
      expect(json.data.successful).toBe(1);
      expect(json.data.failed).toHaveLength(1);
      expect(json.data.failed[0].subjectId).toBe(otherSubject.id);
    });

    it("rejects bulk assign from a TEACHER", async () => {
      const { status } = await callRoute(bulkAssign, {
        method: "POST",
        url: "/api/assignments/bulk",
        token: teacherToken,
        body: { classId, academicYearId, assignments: [{ teacherId: teacherProfileId, subjectId }] },
      });
      expect(status).toBe(403);
    });
  });
});
