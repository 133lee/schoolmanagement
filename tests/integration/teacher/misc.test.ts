import { describe, it, expect, beforeEach } from "vitest";
import { Role, DayOfWeek } from "@prisma/client";
import { GET as getStudents } from "@/app/api/teacher/students/route";
import { GET as getTimetable } from "@/app/api/teacher/timetable/route";
import { GET as getAttendanceTrends } from "@/app/api/teacher/attendance/trends/route";
import prisma from "@/lib/db/prisma";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestGrade,
  createTestClass,
  createTestSubject,
  assignClassTeacher,
} from "../../helpers/db";

describe("teacher misc: students, timetable, attendance trends", () => {
  let teacher: Awaited<ReturnType<typeof createTestUser>>;
  let teacherToken: string;

  beforeEach(async () => {
    await resetDb();
    teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
  });

  describe("GET /api/teacher/students", () => {
    it("returns an empty class-teacher view with no assignment, and the class once assigned", async () => {
      const academicYear = await createTestAcademicYear();

      const empty = await callRoute<{ data: { class: unknown; students: unknown[] } }>(getStudents, {
        url: "/api/teacher/students",
        token: teacherToken,
      });
      expect(empty.status).toBe(200);
      expect(empty.json.data.class).toBeNull();
      expect(empty.json.data.students).toEqual([]);

      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(teacher.teacherProfile!.id, testClass.id, academicYear.id);

      const { status, json } = await callRoute<{ data: { class: { id: string } | null } }>(getStudents, {
        url: "/api/teacher/students",
        token: teacherToken,
      });
      expect(status).toBe(200);
      expect(json.data.class?.id).toBe(testClass.id);
    });
  });

  describe("GET /api/teacher/timetable", () => {
    it("returns only this teacher's own slots, not another teacher's", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject({ name: "History" });

      const ownSlot = await prisma.timetableSlot.create({
        data: {
          classId: testClass.id,
          subjectId: subject.id,
          teacherId: teacher.teacherProfile!.id,
          academicYearId: academicYear.id,
          dayOfWeek: DayOfWeek.THURSDAY,
          periodNumber: 2,
          startTime: "08:00",
          endTime: "08:40",
        },
      });

      const otherTeacher = await createTestUser({ role: Role.TEACHER });
      await prisma.timetableSlot.create({
        data: {
          classId: testClass.id,
          subjectId: subject.id,
          teacherId: otherTeacher.teacherProfile!.id,
          academicYearId: academicYear.id,
          dayOfWeek: DayOfWeek.FRIDAY,
          periodNumber: 1,
          startTime: "07:00",
          endTime: "07:40",
        },
      });

      const { status, json } = await callRoute<{ data: { slots: { id: string }[] } }>(getTimetable, {
        url: "/api/teacher/timetable",
        token: teacherToken,
      });
      expect(status).toBe(200);
      expect(json.data.slots.map((s) => s.id)).toEqual([ownSlot.id]);
    });
  });

  describe("GET /api/teacher/attendance/trends", () => {
    it("requires classId and enforces class access", async () => {
      const missingClassId = await callRoute(getAttendanceTrends, {
        url: "/api/teacher/attendance/trends",
        token: teacherToken,
      });
      expect(missingClassId.status).toBe(400);

      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);

      const outsider = await createTestUser({ role: Role.TEACHER });
      const outsiderToken = await loginAs(outsider.user.email, outsider.password);
      const denied = await callRoute(getAttendanceTrends, {
        url: `/api/teacher/attendance/trends?classId=${testClass.id}`,
        token: outsiderToken,
      });
      expect(denied.status).toBe(403);

      await assignClassTeacher(teacher.teacherProfile!.id, testClass.id, academicYear.id);
      const { status } = await callRoute(getAttendanceTrends, {
        url: `/api/teacher/attendance/trends?classId=${testClass.id}`,
        token: teacherToken,
      });
      expect(status).toBe(200);
    });
  });
});
