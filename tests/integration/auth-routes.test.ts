import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as changePassword } from "@/app/api/auth/change-password/route";
import { GET as hodStatus } from "@/app/api/auth/hod-status/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import { resetDb, createTestUser, createHODUser } from "../helpers/db";

describe("auth/login", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns a real token + user on valid credentials", async () => {
    const user = await createTestUser({ role: Role.TEACHER, email: "login-ok@example.com" });

    const { status, json } = await callRoute<{ data: { token: string; user: { email: string } } }>(login, {
      method: "POST",
      url: "/api/auth/login",
      body: { email: user.user.email, password: user.password },
    });

    expect(status).toBe(200);
    expect(json.data.token).toBeTruthy();
    expect(json.data.user.email).toBe(user.user.email);
  });

  it("rejects a wrong password with 401 and doesn't leak which field was wrong", async () => {
    const user = await createTestUser({ email: "login-wrong@example.com" });

    const { status, json } = await callRoute<{ error: string }>(login, {
      method: "POST",
      url: "/api/auth/login",
      body: { email: user.user.email, password: "not-the-password" },
    });

    expect(status).toBe(401);
    // Deliberately generic — doesn't say "wrong password" specifically,
    // which would confirm the email exists to an attacker.
    expect(json.error).toBe("Invalid email or password");
  });

  it("rejects malformed input with 400 before touching the database", async () => {
    const { status, json } = await callRoute<{ error: string }>(login, {
      method: "POST",
      url: "/api/auth/login",
      body: { email: "not-an-email", password: "" },
    });

    expect(status).toBe(400);
    expect(json.error).toBe("Validation failed");
  });

  it("locks out an email after 5 failed attempts within the rate-limit window", async () => {
    const user = await createTestUser({ email: "login-lockout@example.com" });

    for (let i = 0; i < 5; i++) {
      const { status } = await callRoute(login, {
        method: "POST",
        url: "/api/auth/login",
        body: { email: user.user.email, password: "wrong" },
      });
      expect(status).toBe(401);
    }

    const { status, json } = await callRoute<{ error: string }>(login, {
      method: "POST",
      url: "/api/auth/login",
      body: { email: user.user.email, password: user.password },
    });
    expect(status).toBe(429);
    expect(json.error).toMatch(/too many/i);
  });
});

describe("auth/change-password", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("changes the password when the current password is correct", async () => {
    const user = await createTestUser();
    const token = await loginAs(user.user.email, user.password);

    const { status } = await callRoute(changePassword, {
      method: "POST",
      url: "/api/auth/change-password",
      token,
      body: { currentPassword: user.password, newPassword: "BrandNewPassword123!" },
    });

    expect(status).toBe(200);

    // Old password no longer works, new one does — proves the hash was
    // actually persisted, not just that the route returned 200.
    const oldLogin = await callRoute(login, {
      method: "POST",
      url: "/api/auth/login",
      body: { email: user.user.email, password: user.password },
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await callRoute(login, {
      method: "POST",
      url: "/api/auth/login",
      body: { email: user.user.email, password: "BrandNewPassword123!" },
    });
    expect(newLogin.status).toBe(200);
  });

  it("rejects an incorrect current password without changing anything", async () => {
    const user = await createTestUser();
    const token = await loginAs(user.user.email, user.password);

    const { status } = await callRoute(changePassword, {
      method: "POST",
      url: "/api/auth/change-password",
      token,
      body: { currentPassword: "wrong-current", newPassword: "BrandNewPassword123!" },
    });

    expect(status).toBe(401);
  });

  it("rejects a new password shorter than 8 characters", async () => {
    const user = await createTestUser();
    const token = await loginAs(user.user.email, user.password);

    const { status } = await callRoute(changePassword, {
      method: "POST",
      url: "/api/auth/change-password",
      token,
      body: { currentPassword: user.password, newPassword: "short" },
    });

    // ValidationError (lib/http/errors.ts) maps to 422, not 400 — distinct
    // from the "legacy" ValidationError class that maps to 400.
    expect(status).toBe(422);
  });

  it("requires authentication", async () => {
    const { status } = await callRoute(changePassword, {
      method: "POST",
      url: "/api/auth/change-password",
      body: { currentPassword: "x", newPassword: "BrandNewPassword123!" },
    });

    expect(status).toBe(401);
  });
});

describe("auth/hod-status", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("reports isHOD: false for a regular teacher", async () => {
    const teacher = await createTestUser({ role: Role.TEACHER });
    const token = await loginAs(teacher.user.email, teacher.password);

    const { status, json } = await callRoute<{ data: { isHOD: boolean; department: unknown } }>(hodStatus, {
      url: "/api/auth/hod-status",
      token,
    });

    expect(status).toBe(200);
    expect(json.data.isHOD).toBe(false);
    expect(json.data.department).toBeNull();
  });

  it("reports isHOD: true with department details for a real HOD", async () => {
    const hod = await createHODUser();
    const token = await loginAs(hod.user.email, hod.password);

    const { status, json } = await callRoute<{ data: { isHOD: boolean; department: { id: string } | null } }>(
      hodStatus,
      { url: "/api/auth/hod-status", token }
    );

    expect(status).toBe(200);
    expect(json.data.isHOD).toBe(true);
    expect(json.data.department?.id).toBe(hod.department.id);
  });
});
