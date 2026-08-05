import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as getCurriculum } from "@/app/api/hod/curriculum/route";
import { GET as getClassCurriculum } from "@/app/api/hod/curriculum/[classId]/route";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import {
  resetDb,
  createHODUser,
  createTestUser,
  createTestAcademicYear,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestClassSubject,
} from "../../helpers/db";

describe("hod/curriculum", () => {
  let hod: Awaited<ReturnType<typeof createHODUser>>;
  let hodToken: string;
  let outsiderToken: string;

  beforeEach(async () => {
    await resetDb();
    hod = await createHODUser();
    hodToken = await loginAs(hod.user.email, hod.password);
    const outsider = await createTestUser({ role: Role.TEACHER });
    outsiderToken = await loginAs(outsider.user.email, outsider.password);
  });

  describe("GET /api/hod/curriculum", () => {
    it("returns curriculum items scoped to the HOD's department and secondary grades", async () => {
      await createTestAcademicYear();
      const grade = await createTestGrade(); // GRADE_8, secondary
      const testClass = await createTestClass(grade.id);
      const ownSubject = await createTestSubject({ departmentId: hod.department.id });
      const otherSubject = await createTestSubject();
      const ownClassSubject = await createTestClassSubject(testClass.id, ownSubject.id);
      await createTestClassSubject(testClass.id, otherSubject.id);

      const denied = await callRoute(getCurriculum, { url: "/api/hod/curriculum", token: outsiderToken });
      expect(denied.status).toBe(403);

      const { status, json } = await callRoute<{ data: { curriculum: { classSubjectId: string }[] } }>(
        getCurriculum,
        { url: "/api/hod/curriculum", token: hodToken }
      );
      expect(status).toBe(200);
      const ids = json.data.curriculum.map((c) => c.classSubjectId);
      expect(ids).toContain(ownClassSubject.id);
      expect(ids).toHaveLength(1); // the other department's ClassSubject must not leak in
    });
  });

  describe("GET /api/hod/curriculum/[classId]", () => {
    it("returns only the HOD's department subjects for that class", async () => {
      await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const ownSubject = await createTestSubject({ departmentId: hod.department.id, name: "Chemistry" });
      await createTestClassSubject(testClass.id, ownSubject.id);

      const { status, json } = await callRoute<{ data: { curriculum: { subject: { name: string } }[] } }>(
        getClassCurriculum,
        { url: `/api/hod/curriculum/${testClass.id}`, token: hodToken, params: { classId: testClass.id } }
      );
      expect(status).toBe(200);
      expect(json.data.curriculum.map((c) => c.subject.name)).toEqual(["Chemistry"]);
    });
  });
});
