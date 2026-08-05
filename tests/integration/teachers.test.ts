import { describe, it, expect, beforeEach } from "vitest";
import { Role, Gender, QualificationLevel } from "@prisma/client";
import { GET as listTeachers, POST as createTeacher } from "@/app/api/teachers/route";
import {
  GET as getTeacher,
  PATCH as updateTeacher,
  DELETE as deleteTeacher,
} from "@/app/api/teachers/[id]/route";
import { GET as getTeacherAssignments } from "@/app/api/teachers/[id]/assignments/route";
import { POST as resetPassword } from "@/app/api/teachers/[id]/reset-password/route";
import { GET as getTeacherWorkload } from "@/app/api/teachers/[id]/workload/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import { resetDb, createTestUser, createTestSubject, createTestAcademicYear } from "../helpers/db";

describe("teachers routes", () => {
  let adminToken: string;
  let headTeacherToken: string;
  let teacherToken: string;
  let primarySubjectId: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const headTeacher = await createTestUser({ role: Role.HEAD_TEACHER });
    headTeacherToken = await loginAs(headTeacher.user.email, headTeacher.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
    const subject = await createTestSubject();
    primarySubjectId = subject.id;
  });

  const validTeacherBody = () => ({
    email: `new-teacher-${crypto.randomUUID().slice(0, 8)}@example.com`,
    staffNumber: `STAFF2024${Math.floor(Math.random() * 900 + 100)}`,
    firstName: "New",
    lastName: "Teacher",
    dateOfBirth: "1990-01-01",
    gender: Gender.MALE,
    phone: "0977111222",
    qualification: QualificationLevel.DEGREE,
    hireDate: "2024-01-01",
    primarySubjectId,
  });

  it("supports the full create/list/get/update lifecycle for ADMIN/HEAD_TEACHER, rejects TEACHER create", async () => {
    const denied = await callRoute(createTeacher, {
      method: "POST",
      url: "/api/teachers",
      token: teacherToken,
      body: validTeacherBody(),
    });
    expect(denied.status).toBe(403);

    const created = await callRoute<{ data: { id: string; firstName: string } }>(createTeacher, {
      method: "POST",
      url: "/api/teachers",
      token: headTeacherToken,
      body: validTeacherBody(),
    });
    expect(created.status).toBe(201);
    const teacherId = created.json.data.id;

    const list = await callRoute<{ data: { id: string }[] }>(listTeachers, {
      url: "/api/teachers",
      token: teacherToken,
    });
    expect(list.status).toBe(200);
    expect(list.json.data.map((t) => t.id)).toContain(teacherId);

    const fetched = await callRoute<{ data: { id: string } }>(getTeacher, {
      url: `/api/teachers/${teacherId}`,
      token: teacherToken,
      params: { id: teacherId },
    });
    expect(fetched.status).toBe(200);

    const updated = await callRoute<{ data: { firstName: string } }>(updateTeacher, {
      method: "PATCH",
      url: `/api/teachers/${teacherId}`,
      token: headTeacherToken,
      params: { id: teacherId },
      body: { firstName: "Updated" },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.firstName).toBe("Updated");
  });

  it("rejects a duplicate email on create", async () => {
    const body = validTeacherBody();
    await callRoute(createTeacher, { method: "POST", url: "/api/teachers", token: adminToken, body });

    const { status } = await callRoute(createTeacher, {
      method: "POST",
      url: "/api/teachers",
      token: adminToken,
      body: { ...body, staffNumber: `STAFF2024${Math.floor(Math.random() * 900 + 100)}` },
    });
    expect(status).toBe(400);
  });

  it("only ADMIN can hard-delete a teacher", async () => {
    const created = await callRoute<{ data: { id: string } }>(createTeacher, {
      method: "POST",
      url: "/api/teachers",
      token: adminToken,
      body: validTeacherBody(),
    });
    const teacherId = created.json.data.id;

    const deniedDelete = await callRoute(deleteTeacher, {
      method: "DELETE",
      url: `/api/teachers/${teacherId}`,
      token: headTeacherToken,
      params: { id: teacherId },
    });
    expect(deniedDelete.status).toBe(403);

    const deleted = await callRoute(deleteTeacher, {
      method: "DELETE",
      url: `/api/teachers/${teacherId}`,
      token: adminToken,
      params: { id: teacherId },
    });
    expect(deleted.status).toBe(200);
  });

  it("GET /api/teachers/[id]/assignments returns assignments for the teacher", async () => {
    const teacher = await createTestUser({ role: Role.TEACHER });

    const { status, json } = await callRoute<{ data: unknown[] }>(getTeacherAssignments, {
      url: `/api/teachers/${teacher.teacherProfile!.id}/assignments`,
      token: teacherToken,
      params: { id: teacher.teacherProfile!.id },
    });
    expect(status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("resets a teacher's password to the default (ADMIN/HEAD_TEACHER only), and the new password logs in", async () => {
    const teacher = await createTestUser({ role: Role.TEACHER, email: "reset-target@example.com" });

    const denied = await callRoute(resetPassword, {
      method: "POST",
      url: `/api/teachers/${teacher.teacherProfile!.id}/reset-password`,
      token: teacherToken,
      params: { id: teacher.teacherProfile!.id },
    });
    expect(denied.status).toBe(403);

    const { status } = await callRoute(resetPassword, {
      method: "POST",
      url: `/api/teachers/${teacher.teacherProfile!.id}/reset-password`,
      token: adminToken,
      params: { id: teacher.teacherProfile!.id },
    });
    expect(status).toBe(200);

    const relogin = await loginAs("reset-target@example.com", "teacher123");
    expect(relogin).toBeTruthy();
  });

  it("GET /api/teachers/[id]/workload requires academicYearId and returns workload stats", async () => {
    const teacher = await createTestUser({ role: Role.TEACHER });
    const academicYear = await createTestAcademicYear();

    const missingParam = await callRoute(getTeacherWorkload, {
      url: `/api/teachers/${teacher.teacherProfile!.id}/workload`,
      token: teacherToken,
      params: { id: teacher.teacherProfile!.id },
    });
    expect(missingParam.status).toBe(400);

    const { status } = await callRoute(getTeacherWorkload, {
      url: `/api/teachers/${teacher.teacherProfile!.id}/workload?academicYearId=${academicYear.id}`,
      token: teacherToken,
      params: { id: teacher.teacherProfile!.id },
    });
    expect(status).toBe(200);
  });
});
