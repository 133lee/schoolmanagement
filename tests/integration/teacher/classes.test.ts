import { describe, it, expect, beforeEach } from "vitest";
import { Role, DayOfWeek } from "@prisma/client";
import { GET as getClasses } from "@/app/api/teacher/classes/route";
import { GET as getClassStudents } from "@/app/api/teacher/classes/[classId]/students/route";
import { GET as getClassAttendance } from "@/app/api/teacher/classes/[classId]/attendance/route";
import { GET as getSessionRegister } from "@/app/api/teacher/classes/[classId]/session-register/route";
import { GET as exportClassList } from "@/app/api/teacher/classes/export-class-list/route";
import prisma from "@/lib/db/prisma";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestStudent,
  enrollTestStudent,
  assignClassTeacher,
} from "../../helpers/db";

describe("teacher/classes", () => {
  let classTeacher: Awaited<ReturnType<typeof createTestUser>>;
  let classTeacherToken: string;
  let outsiderToken: string;

  beforeEach(async () => {
    await resetDb();
    classTeacher = await createTestUser({ role: Role.TEACHER });
    classTeacherToken = await loginAs(classTeacher.user.email, classTeacher.password);
    const outsider = await createTestUser({ role: Role.TEACHER });
    outsiderToken = await loginAs(outsider.user.email, outsider.password);
  });

  describe("GET /api/teacher/classes", () => {
    it("returns classes the teacher is assigned to (class teacher + subject teacher, deduplicated)", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(classTeacher.teacherProfile!.id, testClass.id, academicYear.id);

      const { status, json } = await callRoute<{
        data: { allClasses: { id: string }[]; classTeacherClasses: { id: string }[] };
      }>(getClasses, { url: "/api/teacher/classes", token: classTeacherToken });

      expect(status).toBe(200);
      expect(json.data.allClasses.map((c) => c.id)).toContain(testClass.id);
      expect(json.data.classTeacherClasses.map((c) => c.id)).toContain(testClass.id);
    });
  });

  describe("GET /api/teacher/classes/[classId]/students", () => {
    it("returns enrolled students for a class the teacher is assigned to, 403s for an outsider", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(classTeacher.teacherProfile!.id, testClass.id, academicYear.id);
      const student = await createTestStudent();
      await enrollTestStudent(student.id, testClass.id, academicYear.id);

      const denied = await callRoute(getClassStudents, {
        url: `/api/teacher/classes/${testClass.id}/students`,
        token: outsiderToken,
        params: { classId: testClass.id },
      });
      expect(denied.status).toBe(403);

      const { status, json } = await callRoute<{ data: { students: { id: string }[]; total: number } }>(
        getClassStudents,
        { url: `/api/teacher/classes/${testClass.id}/students`, token: classTeacherToken, params: { classId: testClass.id } }
      );
      expect(status).toBe(200);
      expect(json.data.total).toBe(1);
      expect(json.data.students.map((s) => s.id)).toContain(student.id);
    });
  });

  describe("GET /api/teacher/classes/[classId]/attendance", () => {
    it("validates month/period params and rejects an outsider", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(classTeacher.teacherProfile!.id, testClass.id, academicYear.id);

      const badMonth = await callRoute(getClassAttendance, {
        url: `/api/teacher/classes/${testClass.id}/attendance?month=13`,
        token: classTeacherToken,
        params: { classId: testClass.id },
      });
      expect(badMonth.status).toBe(400);

      const denied = await callRoute(getClassAttendance, {
        url: `/api/teacher/classes/${testClass.id}/attendance`,
        token: outsiderToken,
        params: { classId: testClass.id },
      });
      expect(denied.status).toBe(403);

      const { status } = await callRoute(getClassAttendance, {
        url: `/api/teacher/classes/${testClass.id}/attendance`,
        token: classTeacherToken,
        params: { classId: testClass.id },
      });
      expect(status).toBe(200);
    });
  });

  describe("GET /api/teacher/classes/[classId]/session-register", () => {
    it("requires subjectId+termId, and requires the teacher to actually teach that class+subject via a timetable slot", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject();

      const missingParams = await callRoute(getSessionRegister, {
        url: `/api/teacher/classes/${testClass.id}/session-register`,
        token: classTeacherToken,
        params: { classId: testClass.id },
      });
      expect(missingParams.status).toBe(400);

      const noSlot = await callRoute(getSessionRegister, {
        url: `/api/teacher/classes/${testClass.id}/session-register?subjectId=${subject.id}&termId=${term.id}`,
        token: classTeacherToken,
        params: { classId: testClass.id },
      });
      expect(noSlot.status).toBe(400);

      await prisma.timetableSlot.create({
        data: {
          classId: testClass.id,
          subjectId: subject.id,
          teacherId: classTeacher.teacherProfile!.id,
          academicYearId: academicYear.id,
          dayOfWeek: DayOfWeek.MONDAY,
          periodNumber: 1,
          startTime: "07:00",
          endTime: "07:40",
        },
      });

      const { status, json } = await callRoute<{ data: { termLabel: string; students: unknown[] } }>(
        getSessionRegister,
        {
          url: `/api/teacher/classes/${testClass.id}/session-register?subjectId=${subject.id}&termId=${term.id}`,
          token: classTeacherToken,
          params: { classId: testClass.id },
        }
      );
      expect(status).toBe(200);
      expect(json.data.termLabel).toContain(String(academicYear.year));
    });
  });

  describe("GET /api/teacher/classes/export-class-list", () => {
    it("requires classId+mode, and exports a PDF for a class teacher's own class", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(classTeacher.teacherProfile!.id, testClass.id, academicYear.id);
      const student = await createTestStudent();
      await enrollTestStudent(student.id, testClass.id, academicYear.id);

      const missingParams = await callRoute(exportClassList, {
        url: "/api/teacher/classes/export-class-list",
        token: classTeacherToken,
      });
      expect(missingParams.status).toBe(400);

      const denied = await callRoute(exportClassList, {
        url: `/api/teacher/classes/export-class-list?classId=${testClass.id}&mode=class`,
        token: outsiderToken,
      });
      expect(denied.status).toBe(403);

      const { status, contentType, byteLength } = await callRoute(exportClassList, {
        url: `/api/teacher/classes/export-class-list?classId=${testClass.id}&mode=class`,
        token: classTeacherToken,
      });
      expect(status).toBe(200);
      expect(contentType).toBe("application/pdf");
      expect(byteLength).toBeGreaterThan(0);
    });
  });
});
