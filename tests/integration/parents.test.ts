import { describe, it, expect, beforeEach } from "vitest";
import { Role, ParentRelationship } from "@prisma/client";
import { GET as listParents, POST as createParent } from "@/app/api/parents/route";
import { GET as getParent, PATCH as updateParent, DELETE as deleteParent } from "@/app/api/parents/[id]/route";
import { POST as linkStudent, DELETE as unlinkStudent } from "@/app/api/parents/[id]/students/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import { resetDb, createTestUser, createTestStudent } from "../helpers/db";

describe("parents routes", () => {
  let adminToken: string;
  let clerkToken: string;
  let teacherToken: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const clerk = await createTestUser({ role: Role.CLERK });
    clerkToken = await loginAs(clerk.user.email, clerk.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
  });

  it("supports the full create/list/get/update/delete lifecycle for CLERK+, rejects TEACHER create", async () => {
    const denied = await callRoute(createParent, {
      method: "POST",
      url: "/api/parents",
      token: teacherToken,
      body: { firstName: "Jane", lastName: "Banda", phone: "+260977123456" },
    });
    expect(denied.status).toBe(403);

    const created = await callRoute<{ data: { id: string; firstName: string } }>(createParent, {
      method: "POST",
      url: "/api/parents",
      token: clerkToken,
      body: { firstName: "Jane", lastName: "Banda", phone: "+260977123456" },
    });
    expect(created.status).toBe(201);
    const parentId = created.json.data.id;

    const duplicatePhone = await callRoute(createParent, {
      method: "POST",
      url: "/api/parents",
      token: clerkToken,
      body: { firstName: "Other", lastName: "Person", phone: "+260977123456" },
    });
    expect(duplicatePhone.status).toBe(400);

    const invalidPhone = await callRoute(createParent, {
      method: "POST",
      url: "/api/parents",
      token: clerkToken,
      body: { firstName: "Bad", lastName: "Phone", phone: "12345" },
    });
    expect(invalidPhone.status).toBe(400);

    const list = await callRoute<{ data: { id: string }[] }>(listParents, {
      url: "/api/parents",
      token: teacherToken,
    });
    expect(list.status).toBe(200);
    expect(list.json.data.map((p) => p.id)).toContain(parentId);

    const fetched = await callRoute<{ data: { id: string } }>(getParent, {
      url: `/api/parents/${parentId}`,
      token: teacherToken,
      params: { id: parentId },
    });
    expect(fetched.status).toBe(200);

    const updated = await callRoute<{ data: { occupation: string } }>(updateParent, {
      method: "PATCH",
      url: `/api/parents/${parentId}`,
      token: clerkToken,
      params: { id: parentId },
      body: { occupation: "Farmer" },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.occupation).toBe("Farmer");

    const deniedDelete = await callRoute(deleteParent, {
      method: "DELETE",
      url: `/api/parents/${parentId}`,
      token: clerkToken,
      params: { id: parentId },
    });
    expect(deniedDelete.status).toBe(403);

    const deleted = await callRoute(deleteParent, {
      method: "DELETE",
      url: `/api/parents/${parentId}`,
      token: adminToken,
      params: { id: parentId },
    });
    expect(deleted.status).toBe(200);
  });

  describe("linking/unlinking students", () => {
    it("links a student to a guardian, rejects a duplicate link, then unlinks", async () => {
      const parent = await callRoute<{ data: { id: string } }>(createParent, {
        method: "POST",
        url: "/api/parents",
        token: clerkToken,
        body: { firstName: "Jane", lastName: "Banda", phone: "+260977123457" },
      });
      const parentId = parent.json.data.id;
      const student = await createTestStudent();

      const linked = await callRoute(linkStudent, {
        method: "POST",
        url: `/api/parents/${parentId}/students`,
        token: clerkToken,
        params: { id: parentId },
        body: { studentId: student.id, relationship: ParentRelationship.MOTHER, isPrimary: true },
      });
      expect(linked.status).toBe(201);

      const duplicate = await callRoute(linkStudent, {
        method: "POST",
        url: `/api/parents/${parentId}/students`,
        token: clerkToken,
        params: { id: parentId },
        body: { studentId: student.id, relationship: ParentRelationship.MOTHER },
      });
      expect(duplicate.status).toBe(400);

      const deniedUnlink = await callRoute(unlinkStudent, {
        method: "DELETE",
        url: `/api/parents/${parentId}/students?studentId=${student.id}`,
        token: teacherToken,
        params: { id: parentId },
      });
      expect(deniedUnlink.status).toBe(403);

      const unlinked = await callRoute(unlinkStudent, {
        method: "DELETE",
        url: `/api/parents/${parentId}/students?studentId=${student.id}`,
        token: clerkToken,
        params: { id: parentId },
      });
      expect(unlinked.status).toBe(200);
    });
  });
});
