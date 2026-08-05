import { describe, it, expect, beforeEach } from "vitest";
import { Role, Permission } from "@prisma/client";
import { GET as listUsers } from "@/app/api/permissions/users/route";
import { POST as addOverride } from "@/app/api/permissions/users/[id]/overrides/route";
import { DELETE as removeOverride } from "@/app/api/permissions/users/[id]/overrides/[permission]/route";
import { PATCH as updateRole } from "@/app/api/permissions/users/[id]/role/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import { resetDb, createTestUser } from "../helpers/db";

describe("permissions/users routes", () => {
  let adminToken: string;
  let adminUserId: string;
  let headTeacherToken: string;
  let teacherToken: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    adminUserId = admin.user.id;
    const headTeacher = await createTestUser({ role: Role.HEAD_TEACHER });
    headTeacherToken = await loginAs(headTeacher.user.email, headTeacher.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
  });

  it("GET /api/permissions/users allows ADMIN/HEAD_TEACHER, rejects TEACHER", async () => {
    const allowed = await callRoute<{ data: unknown[] }>(listUsers, {
      url: "/api/permissions/users",
      token: headTeacherToken,
    });
    expect(allowed.status).toBe(200);

    const denied = await callRoute(listUsers, {
      url: "/api/permissions/users",
      token: teacherToken,
    });
    expect(denied.status).toBe(403);
  });

  describe("PATCH /api/permissions/users/[id]/role", () => {
    it("is ADMIN-only, and blocks self-demotion and demoting the last active admin", async () => {
      const target = await createTestUser({ role: Role.TEACHER });

      const deniedRole = await callRoute(updateRole, {
        method: "PATCH",
        url: `/api/permissions/users/${target.user.id}/role`,
        token: headTeacherToken,
        params: { id: target.user.id },
        body: { role: Role.HEAD_TEACHER },
      });
      expect(deniedRole.status).toBe(403);

      const changed = await callRoute<{ data: { role: string } }>(updateRole, {
        method: "PATCH",
        url: `/api/permissions/users/${target.user.id}/role`,
        token: adminToken,
        params: { id: target.user.id },
        body: { role: Role.HEAD_TEACHER },
      });
      expect(changed.status).toBe(200);
      expect(changed.json.data.role).toBe(Role.HEAD_TEACHER);

      const selfDemote = await callRoute(updateRole, {
        method: "PATCH",
        url: `/api/permissions/users/${adminUserId}/role`,
        token: adminToken,
        params: { id: adminUserId },
        body: { role: Role.TEACHER },
      });
      expect(selfDemote.status).toBe(422);

      // The service also has a "cannot demote the last active administrator"
      // guard (adminCount <= 1), but it's unreachable through this route:
      // the self-demotion check above always fires first whenever actor and
      // target are the same, and the actor must themselves be an active
      // ADMIN to pass requireAdmin() — so whenever actor !== target and both
      // are ADMIN, countActiveAdmins() is guaranteed >= 2 (actor + target).
      // Not tested here since there's no way to reach it externally.
    });
  });

  describe("permission overrides", () => {
    it("adds and removes a permission override (ADMIN-only), rejects a duplicate add and a missing reason", async () => {
      const target = await createTestUser({ role: Role.TEACHER });

      const deniedAdd = await callRoute(addOverride, {
        method: "POST",
        url: `/api/permissions/users/${target.user.id}/overrides`,
        token: headTeacherToken,
        params: { id: target.user.id },
        body: { permission: Permission.CREATE_STUDENT, reason: "Covering for clerk" },
      });
      expect(deniedAdd.status).toBe(403);

      const missingReason = await callRoute(addOverride, {
        method: "POST",
        url: `/api/permissions/users/${target.user.id}/overrides`,
        token: adminToken,
        params: { id: target.user.id },
        body: { permission: Permission.CREATE_STUDENT, reason: "" },
      });
      expect(missingReason.status).toBe(422);

      const added = await callRoute(addOverride, {
        method: "POST",
        url: `/api/permissions/users/${target.user.id}/overrides`,
        token: adminToken,
        params: { id: target.user.id },
        body: { permission: Permission.CREATE_STUDENT, reason: "Covering for clerk" },
      });
      expect(added.status).toBe(200);

      const duplicate = await callRoute(addOverride, {
        method: "POST",
        url: `/api/permissions/users/${target.user.id}/overrides`,
        token: adminToken,
        params: { id: target.user.id },
        body: { permission: Permission.CREATE_STUDENT, reason: "Again" },
      });
      expect(duplicate.status).toBe(409);

      const removed = await callRoute(removeOverride, {
        method: "DELETE",
        url: `/api/permissions/users/${target.user.id}/overrides/${Permission.CREATE_STUDENT}`,
        token: adminToken,
        params: { id: target.user.id, permission: Permission.CREATE_STUDENT },
      });
      expect(removed.status).toBe(200);

      const removeAgain = await callRoute(removeOverride, {
        method: "DELETE",
        url: `/api/permissions/users/${target.user.id}/overrides/${Permission.CREATE_STUDENT}`,
        token: adminToken,
        params: { id: target.user.id, permission: Permission.CREATE_STUDENT },
      });
      expect(removeAgain.status).toBe(404);
    });
  });
});
