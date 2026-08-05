import { describe, it, expect, beforeEach } from "vitest";
import { Role, GradeLevel } from "@prisma/client";
import { GET as getClasses } from "@/app/api/hod/classes/route";
import { GET as getSubjects } from "@/app/api/hod/subjects/route";
import { GET as getTeachers } from "@/app/api/hod/teachers/route";
import { GET as getProfile } from "@/app/api/hod/profile/route";
import { GET as getTeacherSubjects } from "@/app/api/hod/teachers/[teacherId]/subjects/route";
import { GET as getAssessmentEntries } from "@/app/api/hod/assessment-entries/route";
import { PATCH as extendDeadline } from "@/app/api/hod/assessment-entries/deadline/route";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import prisma from "@/lib/db/prisma";
import {
  resetDb,
  createHODUser,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestStudent,
  enrollTestStudent,
  createTestAssessment,
  createTestAssessmentResult,
  assignTeacherToDepartment,
  assignTeacherSubject,
} from "../../helpers/db";

describe("hod misc: classes, subjects, teachers, profile, assessment-entries", () => {
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

  describe("GET /api/hod/classes", () => {
    it("rejects a non-HOD and returns only secondary-grade classes", async () => {
      const denied = await callRoute(getClasses, { url: "/api/hod/classes", token: outsiderToken });
      expect(denied.status).toBe(403);

      const primaryGrade = await createTestGrade({ level: GradeLevel.GRADE_3, sequence: 3 });
      const secondaryGrade = await createTestGrade();
      const primaryClass = await createTestClass(primaryGrade.id);
      const secondaryClass = await createTestClass(secondaryGrade.id);

      const { status, json } = await callRoute<{ data: { id: string }[] }>(getClasses, {
        url: "/api/hod/classes",
        token: hodToken,
      });
      expect(status).toBe(200);
      const ids = json.data.map((c) => c.id);
      expect(ids).toContain(secondaryClass.id);
      expect(ids).not.toContain(primaryClass.id);
    });
  });

  describe("GET /api/hod/subjects", () => {
    it("supports paginated (default) and mode=all, scoped to the HOD's department", async () => {
      const ownSubject = await createTestSubject({ departmentId: hod.department.id });
      await createTestSubject(); // other department

      const paginated = await callRoute<{ data: { id: string }[] }>(getSubjects, {
        url: "/api/hod/subjects",
        token: hodToken,
      });
      expect(paginated.status).toBe(200);
      expect(paginated.json.data.map((s) => s.id)).toEqual([ownSubject.id]);

      const all = await callRoute<{ data: { id: string }[] }>(getSubjects, {
        url: "/api/hod/subjects?mode=all",
        token: hodToken,
      });
      expect(all.status).toBe(200);
      expect(all.json.data.map((s) => s.id)).toEqual([ownSubject.id]);
    });
  });

  describe("GET /api/hod/teachers", () => {
    it("includes the HOD themselves plus department members, excludes outsiders", async () => {
      const member = await createTestUser({ role: Role.TEACHER });
      await assignTeacherToDepartment(member.teacherProfile!.id, hod.department.id);
      const outsiderTeacher = await createTestUser({ role: Role.TEACHER });

      const { status, json } = await callRoute<{ data: { id: string }[] }>(getTeachers, {
        url: "/api/hod/teachers?mode=all",
        token: hodToken,
      });
      expect(status).toBe(200);
      const ids = json.data.map((t) => t.id);
      expect(ids).toContain(hod.teacherProfile!.id);
      expect(ids).toContain(member.teacherProfile!.id);
      expect(ids).not.toContain(outsiderTeacher.teacherProfile!.id);
    });
  });

  describe("GET /api/hod/profile", () => {
    it("returns the HOD's own profile including department info", async () => {
      const { status, json } = await callRoute<{ data: { email: string; department: { id: string } } }>(
        getProfile,
        { url: "/api/hod/profile", token: hodToken }
      );
      expect(status).toBe(200);
      expect(json.data.email).toBe(hod.user.email);
      expect(json.data.department.id).toBe(hod.department.id);
    });
  });

  describe("GET /api/hod/teachers/[teacherId]/subjects", () => {
    it("returns subjects the teacher is qualified for, scoped to the HOD's department", async () => {
      const teacher = await createTestUser({ role: Role.TEACHER });
      await assignTeacherToDepartment(teacher.teacherProfile!.id, hod.department.id);
      const ownSubject = await createTestSubject({ departmentId: hod.department.id });
      const otherSubject = await createTestSubject();
      await assignTeacherSubject(teacher.teacherProfile!.id, ownSubject.id);
      await assignTeacherSubject(teacher.teacherProfile!.id, otherSubject.id);

      const { status, json } = await callRoute<{ data: { id: string }[] }>(getTeacherSubjects, {
        url: `/api/hod/teachers/${teacher.teacherProfile!.id}/subjects`,
        token: hodToken,
        params: { teacherId: teacher.teacherProfile!.id },
      });
      expect(status).toBe(200);
      expect(json.data.map((s) => s.id)).toEqual([ownSubject.id]);
    });
  });

  describe("assessment-entries", () => {
    it("computes real entry-status/stats from seeded enrollments, assignments, and partial results", async () => {
      const academicYear = await createTestAcademicYear();
      // Deadline (falls back to term.endDate when no AssessmentWindow exists)
      // must be in the future, or every entry reads "overdue" regardless of
      // scoresEntered.
      const term = await createTestTerm(academicYear.id, { endDate: new Date("2099-12-31") });
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject({ departmentId: hod.department.id });

      const entryTeacher = await createTestUser({ role: Role.TEACHER });
      await assignTeacherToDepartment(entryTeacher.teacherProfile!.id, hod.department.id);
      await prisma.subjectTeacherAssignment.create({
        data: {
          teacherId: entryTeacher.teacherProfile!.id,
          subjectId: subject.id,
          classId: testClass.id,
          academicYearId: academicYear.id,
        },
      });

      const studentA = await createTestStudent({ firstName: "A" });
      const studentB = await createTestStudent({ firstName: "B" });
      await enrollTestStudent(studentA.id, testClass.id, academicYear.id);
      await enrollTestStudent(studentB.id, testClass.id, academicYear.id);

      const assessment = await createTestAssessment(subject.id, testClass.id, term.id, { examType: "CAT" });
      // Only one of the two enrolled students has a score entered -> in-progress.
      await createTestAssessmentResult(studentA.id, assessment.id, 75);

      const entries = await callRoute<{
        data: {
          assessments: {
            teacherId: string;
            totalStudents: number;
            scoresEntered: number;
            status: string;
          }[];
          stats: { completed: number; inProgress: number; notStarted: number; totalAssessments: number };
        };
      }>(getAssessmentEntries, { url: "/api/hod/assessment-entries", token: hodToken });

      expect(entries.status).toBe(200);
      expect(entries.json.data.assessments).toHaveLength(1);
      const entry = entries.json.data.assessments[0];
      expect(entry.teacherId).toBe(entryTeacher.teacherProfile!.id);
      expect(entry.totalStudents).toBe(2);
      expect(entry.scoresEntered).toBe(1);
      expect(entry.status).toBe("in-progress");
      expect(entries.json.data.stats).toMatchObject({
        completed: 0,
        inProgress: 1,
        notStarted: 0,
        totalAssessments: 1,
      });

      const denied = await callRoute(extendDeadline, {
        method: "PATCH",
        url: "/api/hod/assessment-entries/deadline",
        token: outsiderToken,
        body: { termId: term.id, examType: "CAT", newDeadline: "2026-12-31T00:00:00.000Z" },
      });
      expect(denied.status).toBe(403);

      const { status, json } = await callRoute<{ data: { closesAt: string } }>(extendDeadline, {
        method: "PATCH",
        url: "/api/hod/assessment-entries/deadline",
        token: hodToken,
        body: { termId: term.id, examType: "CAT", newDeadline: "2026-12-31T00:00:00.000Z" },
      });
      expect(status).toBe(200);
      expect(new Date(json.data.closesAt).toISOString().startsWith("2026-12-31")).toBe(true);
    });
  });
});
