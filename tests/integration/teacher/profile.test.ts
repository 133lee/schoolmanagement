import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as getProfile } from "@/app/api/teacher/profile/route";
import { GET as getProfileSubjects } from "@/app/api/teacher/profile/subjects/route";
import prisma from "@/lib/db/prisma";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import { resetDb, createTestUser, createTestSubject } from "../../helpers/db";

describe("teacher/profile", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("GET /api/teacher/profile", () => {
    it("returns the caller's own profile and rejects non-TEACHER roles", async () => {
      const teacher = await createTestUser({ role: Role.TEACHER });
      const teacherToken = await loginAs(teacher.user.email, teacher.password);

      const { status, json } = await callRoute<{ data: { id: string; email: string } }>(getProfile, {
        url: "/api/teacher/profile",
        token: teacherToken,
      });
      expect(status).toBe(200);
      expect(json.data.email).toBe(teacher.user.email);

      const admin = await createTestUser({ role: Role.ADMIN });
      const adminToken = await loginAs(admin.user.email, admin.password);
      const denied = await callRoute(getProfile, { url: "/api/teacher/profile", token: adminToken });
      expect(denied.status).toBe(403);
    });
  });

  describe("GET /api/teacher/profile/subjects", () => {
    it("returns the deduplicated list of subjects the teacher teaches", async () => {
      const teacher = await createTestUser({ role: Role.TEACHER });
      const teacherToken = await loginAs(teacher.user.email, teacher.password);
      const subject = await createTestSubject({ name: "Biology" });
      // getTeacherSubjects reads TeacherSubject (qualified-to-teach), not
      // SubjectTeacherAssignment (current class assignment) — different model.
      await prisma.teacherSubject.create({
        data: { teacherId: teacher.teacherProfile!.id, subjectId: subject.id },
      });

      const { status, json } = await callRoute<{ data: { subjects: { id: string }[] } }>(getProfileSubjects, {
        url: "/api/teacher/profile/subjects",
        token: teacherToken,
      });
      expect(status).toBe(200);
      expect(json.data.subjects.map((s) => s.id)).toContain(subject.id);
    });
  });
});
