import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as listDepartments, POST as createDepartment } from "@/app/api/departments/route";
import {
  GET as getDepartment,
  PATCH as updateDepartment,
  DELETE as deleteDepartment,
} from "@/app/api/departments/[id]/route";
import { POST as addMembers, DELETE as removeMember } from "@/app/api/departments/[id]/members/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import { resetDb, createTestUser, createTestDepartment } from "../helpers/db";

describe("departments routes", () => {
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
    const denied = await callRoute(createDepartment, {
      method: "POST",
      url: "/api/departments",
      token: teacherToken,
      body: { name: "Science Department", code: "SCI" },
    });
    expect(denied.status).toBe(403);

    const created = await callRoute<{ data: { id: string; name: string } }>(createDepartment, {
      method: "POST",
      url: "/api/departments",
      token: headTeacherToken,
      body: { name: "Science Department", code: "SCI" },
    });
    expect(created.status).toBe(201);
    const departmentId = created.json.data.id;

    const list = await callRoute<{ data: { id: string }[] }>(listDepartments, {
      url: "/api/departments",
      token: teacherToken,
    });
    expect(list.status).toBe(200);
    expect(list.json.data.map((d) => d.id)).toContain(departmentId);

    const fetched = await callRoute<{ data: { id: string } }>(getDepartment, {
      url: `/api/departments/${departmentId}`,
      token: teacherToken,
      params: { id: departmentId },
    });
    expect(fetched.status).toBe(200);

    const updated = await callRoute<{ data: { name: string } }>(updateDepartment, {
      method: "PATCH",
      url: `/api/departments/${departmentId}`,
      token: headTeacherToken,
      params: { id: departmentId },
      body: { name: "Natural Sciences Department" },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.name).toBe("Natural Sciences Department");

    const deniedDelete = await callRoute(deleteDepartment, {
      method: "DELETE",
      url: `/api/departments/${departmentId}`,
      token: headTeacherToken,
      params: { id: departmentId },
    });
    expect(deniedDelete.status).toBe(403);

    const deleted = await callRoute(deleteDepartment, {
      method: "DELETE",
      url: `/api/departments/${departmentId}`,
      token: adminToken,
      params: { id: departmentId },
    });
    expect(deleted.status).toBe(200);
  });

  it("only ADMIN can add/remove department members, and invalid teacher IDs are rejected", async () => {
    const department = await createTestDepartment();
    const teacher = await createTestUser({ role: Role.TEACHER });

    const deniedAdd = await callRoute(addMembers, {
      method: "POST",
      url: `/api/departments/${department.id}/members`,
      token: headTeacherToken,
      params: { id: department.id },
      body: { teacherIds: [teacher.teacherProfile!.id] },
    });
    expect(deniedAdd.status).toBe(403);

    const invalidIds = await callRoute(addMembers, {
      method: "POST",
      url: `/api/departments/${department.id}/members`,
      token: adminToken,
      params: { id: department.id },
      body: { teacherIds: ["does-not-exist"] },
    });
    expect(invalidIds.status).toBe(400);

    const added = await callRoute<{ data: { message: string } }>(addMembers, {
      method: "POST",
      url: `/api/departments/${department.id}/members`,
      token: adminToken,
      params: { id: department.id },
      body: { teacherIds: [teacher.teacherProfile!.id] },
    });
    expect(added.status).toBe(200);

    const removed = await callRoute(removeMember, {
      method: "DELETE",
      url: `/api/departments/${department.id}/members`,
      token: adminToken,
      params: { id: department.id },
      body: { teacherId: teacher.teacherProfile!.id },
    });
    expect(removed.status).toBe(200);
  });
});
