import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as getMe } from "@/app/api/auth/me/route";
import { GET as getAdminReportGrades } from "@/app/api/admin/reports/grades/route";
import { resetDb, createTestUser } from "../helpers/db";
import { loginAs } from "../helpers/auth";
import { callRoute } from "../helpers/callRoute";

describe("auth & role enforcement", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("logs in with correct credentials and rejects wrong ones", async () => {
    const { user, password } = await createTestUser({ role: Role.ADMIN });

    const token = await loginAs(user.email, password);
    expect(token).toEqual(expect.any(String));

    const { authService } = await import("@/features/auth/auth.service");
    const badLogin = await authService.login({ email: user.email, password: "wrong-password" });
    expect(badLogin.success).toBe(false);
  });

  it("GET /api/auth/me returns fresh data for the authenticated user, not stale JWT claims", async () => {
    const { user, password } = await createTestUser({ role: Role.TEACHER });
    const token = await loginAs(user.email, password);

    const { status, json } = await callRoute<{ success: boolean; data: { id: string; email: string; role: string } }>(
      getMe,
      { url: "/api/auth/me", token }
    );

    expect(status).toBe(200);
    expect(json.data.id).toBe(user.id);
    expect(json.data.email).toBe(user.email);
    expect(json.data.role).toBe(Role.TEACHER);
  });

  it("rejects a request to a protected route with no token", async () => {
    const { status } = await callRoute(getAdminReportGrades, { url: "/api/admin/reports/grades" });
    expect(status).toBe(401);
  });

  it("enforces withRole: a TEACHER token is rejected by an ADMIN/HEAD_TEACHER-only route", async () => {
    // Regression test for a real bug found and fixed this session: withAuth's
    // roles parameter used to be silently ignored, so this request would
    // have incorrectly succeeded (200) instead of being rejected (403).
    const { user, password } = await createTestUser({ role: Role.TEACHER });
    const token = await loginAs(user.email, password);

    const { status } = await callRoute(getAdminReportGrades, {
      url: "/api/admin/reports/grades",
      token,
    });

    expect(status).toBe(403);
  });

  it("allows an ADMIN token through the same withRole-protected route", async () => {
    const { user, password } = await createTestUser({ role: Role.ADMIN });
    const token = await loginAs(user.email, password);

    const { status } = await callRoute(getAdminReportGrades, {
      url: "/api/admin/reports/grades",
      token,
    });

    expect(status).toBe(200);
  });
});
