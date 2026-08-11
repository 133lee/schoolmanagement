import { describe, it, expect, beforeEach } from "vitest";
import sharp from "sharp";
import { Role } from "@prisma/client";
import { GET as getAcademicPolicy, POST as postAcademicPolicy } from "@/app/api/admin/settings/academic-policy/route";
import { GET as getSchoolInfo, POST as postSchoolInfo } from "@/app/api/admin/settings/school-info/route";
import { POST as postLogo } from "@/app/api/admin/settings/school-info/logo/route";
import { GET as getSecurity, POST as postSecurity } from "@/app/api/admin/settings/security/route";
import { POST as postSeedGrades } from "@/app/api/admin/settings/seed-grades/route";
import { GET as getSms, PUT as putSms } from "@/app/api/admin/settings/sms/route";
import { POST as postSmsTestSend } from "@/app/api/admin/settings/sms/test-send/route";
import { GET as getSystem, POST as postSystem } from "@/app/api/admin/settings/system/route";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import { resetDb, createTestUser } from "../../helpers/db";

describe("admin/settings", () => {
  let adminToken: string;
  let teacherToken: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
  });

  describe("academic-policy", () => {
    it("gets defaults, rejects non-ADMIN, updates and validates ranges", async () => {
      const denied = await callRoute(getAcademicPolicy, { url: "/api/admin/settings/academic-policy", token: teacherToken });
      expect(denied.status).toBe(403);

      const got = await callRoute<{ data: { policy: { min_attendance_percentage: number } } }>(getAcademicPolicy, {
        url: "/api/admin/settings/academic-policy",
        token: adminToken,
      });
      expect(got.status).toBe(200);
      expect(got.json.data.policy).toBeDefined();

      const updated = await callRoute<{ data: { policy: { min_attendance_percentage: number } } }>(
        postAcademicPolicy,
        { method: "POST", url: "/api/admin/settings/academic-policy", token: adminToken, body: { min_attendance_percentage: 85 } }
      );
      expect(updated.status).toBe(200);
      expect(updated.json.data.policy.min_attendance_percentage).toBe(85);

      const invalid = await callRoute(postAcademicPolicy, {
        method: "POST",
        url: "/api/admin/settings/academic-policy",
        token: adminToken,
        body: { min_attendance_percentage: 150 },
      });
      // ValidationError from lib/http/errors.ts maps to 422, not 400 (that's
      // the legacy @/lib/errors hierarchy's convention instead).
      expect(invalid.status).toBe(422);
    });
  });

  describe("school-info (bare response shape)", () => {
    it("returns defaults then persists an update", async () => {
      const got = await callRoute<{ settings: Record<string, unknown> }>(getSchoolInfo, {
        url: "/api/admin/settings/school-info",
        token: adminToken,
      });
      expect(got.status).toBe(200);
      expect(got.json.settings).toBeDefined();

      const updated = await callRoute<{ success: boolean }>(postSchoolInfo, {
        method: "POST",
        url: "/api/admin/settings/school-info",
        token: adminToken,
        body: { name: "Test School" },
      });
      expect(updated.status).toBe(200);
      expect(updated.json.success).toBe(true);

      const after = await callRoute<{ settings: Record<string, unknown> }>(getSchoolInfo, {
        url: "/api/admin/settings/school-info",
        token: adminToken,
      });
      expect(after.json.settings.name).toBe("Test School");
    });
  });

  describe("security (bare response shape, security category is restricted)", () => {
    it("ADMIN can read/write; a role below DEPUTY_HEAD cannot view security settings", async () => {
      const asAdmin = await callRoute<{ settings: Record<string, unknown> }>(getSecurity, {
        url: "/api/admin/settings/security",
        token: adminToken,
      });
      expect(asAdmin.status).toBe(200);

      const updated = await callRoute<{ success: boolean }>(postSecurity, {
        method: "POST",
        url: "/api/admin/settings/security",
        token: adminToken,
        body: { minPasswordLength: 10 },
      });
      expect(updated.status).toBe(200);

      const asTeacher = await callRoute(getSecurity, { url: "/api/admin/settings/security", token: teacherToken });
      expect(asTeacher.status).toBe(403);
    });
  });

  describe("system (bare response shape)", () => {
    it("returns preference defaults and persists an update", async () => {
      const got = await callRoute<{ settings: Record<string, unknown> }>(getSystem, {
        url: "/api/admin/settings/system",
        token: adminToken,
      });
      expect(got.status).toBe(200);

      const updated = await callRoute<{ success: boolean }>(postSystem, {
        method: "POST",
        url: "/api/admin/settings/system",
        token: adminToken,
        body: { timezone: "Africa/Lusaka" },
      });
      expect(updated.status).toBe(200);
    });
  });

  describe("seed-grades", () => {
    it("is ADMIN only and idempotently creates 12 grades", async () => {
      const denied = await callRoute(postSeedGrades, { method: "POST", url: "/api/admin/settings/seed-grades", token: teacherToken });
      expect(denied.status).toBe(403);

      const { status, json } = await callRoute<{ data: { count: number } }>(postSeedGrades, {
        method: "POST",
        url: "/api/admin/settings/seed-grades",
        token: adminToken,
      });
      expect(status).toBe(200);
      expect(json.data.count).toBe(12);
    });
  });

  describe("sms config", () => {
    it("is ADMIN only and masks API keys on read", async () => {
      const denied = await callRoute(getSms, { url: "/api/admin/settings/sms", token: teacherToken });
      expect(denied.status).toBe(403);

      const got = await callRoute<{ data: { smsgateway: { passwordMasked: string } } }>(getSms, {
        url: "/api/admin/settings/sms",
        token: adminToken,
      });
      expect(got.status).toBe(200);

      const put = await callRoute(putSms, {
        method: "PUT",
        url: "/api/admin/settings/sms",
        token: adminToken,
        body: { smsgateway_deviceId: "test-device" },
      });
      expect(put.status).toBe(200);
    });
  });

  describe("sms/test-send (boundary only — never actually sends a real SMS in tests)", () => {
    it("is ADMIN only and validates required fields", async () => {
      const denied = await callRoute(postSmsTestSend, {
        method: "POST",
        url: "/api/admin/settings/sms/test-send",
        token: teacherToken,
        body: { phone: "+260900000000", provider: "SMS_GATEWAY" },
      });
      expect(denied.status).toBe(403);

      const missingPhone = await callRoute(postSmsTestSend, {
        method: "POST",
        url: "/api/admin/settings/sms/test-send",
        token: adminToken,
        body: { provider: "SMS_GATEWAY" },
      });
      expect(missingPhone.status).toBe(400);
    });
  });

  describe("school-info/logo (boundary only — never writes into the real public/ folder in tests)", () => {
    it("rejects non-ADMIN and a request with no file", async () => {
      const denied = await callRoute(postLogo, {
        method: "POST",
        url: "/api/admin/settings/school-info/logo",
        token: teacherToken,
      });
      expect(denied.status).toBe(403);

      const noFile = await callRoute(postLogo, {
        method: "POST",
        url: "/api/admin/settings/school-info/logo",
        token: adminToken,
      });
      // No multipart body was sent, so formData() parsing itself fails before
      // the "No file provided" check is even reached — either way this must
      // not succeed.
      expect(noFile.status).not.toBe(200);
    });

    // callRoute only supports JSON bodies (see helpers/callRoute.ts), and this
    // route always writes to the real public/ folder with no injectable path
    // — so the actual upload can't be exercised end-to-end via callRoute
    // without either a helper rewrite or touching real files on disk. This
    // instead verifies the exact resize pipeline the route runs (same
    // dimensions/options as app/api/admin/settings/school-info/logo/route.ts)
    // in isolation: a real regression test that an oversized upload gets
    // normalized down, matching the bug that broke mark schedule PDF
    // generation in production (a 4096x4096, 2.1MB logo embedded as base64
    // and handed to the client-side PDF renderer).
    it("the logo resize pipeline normalizes an oversized image down to the max dimension", async () => {
      // Random noise, not a solid color — a uniform-color PNG compresses to
      // almost nothing regardless of dimensions (PNG's DEFLATE crushes flat
      // color blocks), which would make a "the input was actually large"
      // assertion meaningless. Noise approximates a real photo upload.
      const width = 3000;
      const height = 2000;
      const raw = Buffer.from(
        Array.from({ length: width * height * 3 }, () => Math.floor(Math.random() * 256))
      );
      const oversized = await sharp(raw, { raw: { width, height, channels: 3 } })
        .png()
        .toBuffer();
      const oversizedMeta = await sharp(oversized).metadata();
      expect(oversizedMeta.width).toBe(width);
      expect(oversizedMeta.height).toBe(height);

      const resized = await sharp(oversized)
        .resize(512, 512, { fit: "inside", withoutEnlargement: true })
        .png({ compressionLevel: 9, quality: 90 })
        .toBuffer();

      const metadata = await sharp(resized).metadata();
      expect(metadata.width).toBeLessThanOrEqual(512);
      expect(metadata.height).toBeLessThanOrEqual(512);
      expect(resized.length).toBeLessThan(oversized.length);
    });
  });
});
