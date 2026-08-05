import { describe, it, expect, beforeEach } from "vitest";
import { Role, DayOfWeek, GradeLevel } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { POST as checkAvailability } from "@/app/api/timetables/check-availability/route";
import { GET as detectClashes } from "@/app/api/timetables/detect-clashes/route";
import { GET as getSuggestions } from "@/app/api/timetables/suggestions/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestSubject,
  assignSubjectTeacher,
} from "../helpers/db";

describe("timetables routes (secondary timetable conflict detection)", () => {
  let teacherToken: string;
  let teacherAId: string;
  let classId: string;
  let subjectId: string;
  let termId: string;
  let academicYearId: string;
  let timeSlotId: string;

  beforeEach(async () => {
    await resetDb();
    const teacherA = await createTestUser({ role: Role.TEACHER });
    teacherAId = teacherA.teacherProfile!.id;
    teacherToken = await loginAs(teacherA.user.email, teacherA.password);

    const academicYear = await createTestAcademicYear();
    academicYearId = academicYear.id;
    const term = await createTestTerm(academicYear.id);
    termId = term.id;
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    classId = testClass.id;
    const subject = await createTestSubject();
    subjectId = subject.id;

    const timeSlot = await prisma.timeSlot.create({
      data: { startTime: "08:00", endTime: "08:40", label: "Period 1" },
    });
    timeSlotId = timeSlot.id;
  });

  describe("POST /api/timetables/check-availability", () => {
    it("reports available:true with no booking, available:false once one exists", async () => {
      const free = await callRoute<{ data: { available: boolean } }>(checkAvailability, {
        method: "POST",
        url: "/api/timetables/check-availability",
        token: teacherToken,
        body: {
          type: "teacher",
          teacherId: teacherAId,
          timeSlotId,
          termId,
          dayOfWeek: DayOfWeek.MONDAY,
        },
      });
      expect(free.status).toBe(200);
      expect(free.json.data.available).toBe(true);

      await prisma.secondaryTimetable.create({
        data: {
          classId,
          subjectId,
          teacherId: teacherAId,
          academicYearId,
          termId,
          dayOfWeek: DayOfWeek.MONDAY,
          timeSlotId,
        },
      });

      const busy = await callRoute<{
        data: { available: boolean; conflict?: { type: string } };
      }>(checkAvailability, {
        method: "POST",
        url: "/api/timetables/check-availability",
        token: teacherToken,
        body: {
          type: "teacher",
          teacherId: teacherAId,
          timeSlotId,
          termId,
          dayOfWeek: DayOfWeek.MONDAY,
        },
      });
      expect(busy.status).toBe(200);
      expect(busy.json.data.available).toBe(false);
      expect(busy.json.data.conflict?.type).toBe("teacher");
    });

    it("requires a type of 'teacher' or 'class'", async () => {
      const { status, json } = await callRoute<{ error: string }>(checkAvailability, {
        method: "POST",
        url: "/api/timetables/check-availability",
        token: teacherToken,
        body: { type: "bogus", timeSlotId, termId, dayOfWeek: DayOfWeek.MONDAY },
      });
      expect(status).toBe(400);
      expect(json.error).toMatch(/Invalid type/);
    });
  });

  describe("GET /api/timetables/detect-clashes", () => {
    it("returns zero clashes for non-conflicting bookings", async () => {
      // NOTE: detectClashes() scans for two SecondaryTimetable rows sharing
      // the same (teacherId, termId, dayOfWeek, timeSlotId) — or the same
      // (classId, termId, dayOfWeek, timeSlotId) — and reports them as a
      // clash. But SecondaryTimetable has DB-level unique constraints on
      // exactly both of those tuples ("teacher_period_unique" and
      // "class_period_unique", schema.prisma) — confirmed empirically: a
      // second insert violating either one throws a Prisma unique-constraint
      // error before detectClashes could ever see the row. So the scanning
      // logic in detectClashes() is unreachable in production; this test
      // only proves the non-conflicting path and the required-param guard.
      const otherGrade = await createTestGrade({ level: GradeLevel.GRADE_9, sequence: 9 });
      const otherClass = await createTestClass(otherGrade.id);
      const otherSlot = await prisma.timeSlot.create({
        data: { startTime: "08:40", endTime: "09:20", label: "Period 2" },
      });

      await prisma.secondaryTimetable.createMany({
        data: [
          { classId, subjectId, teacherId: teacherAId, academicYearId, termId, dayOfWeek: DayOfWeek.MONDAY, timeSlotId },
          { classId: otherClass.id, subjectId, teacherId: teacherAId, academicYearId, termId, dayOfWeek: DayOfWeek.MONDAY, timeSlotId: otherSlot.id },
        ],
      });

      const { status, json } = await callRoute<{
        data: { totalClashes: number; teacherClashes: unknown[]; classClashes: unknown[] };
      }>(detectClashes, {
        url: `/api/timetables/detect-clashes?termId=${termId}`,
        token: teacherToken,
      });
      expect(status).toBe(200);
      expect(json.data.totalClashes).toBe(0);
      expect(json.data.teacherClashes).toHaveLength(0);
      expect(json.data.classClashes).toHaveLength(0);
    });

    it("confirms clashes are actually unreachable: the DB itself rejects a duplicate teacher/slot booking", async () => {
      await prisma.secondaryTimetable.create({
        data: { classId, subjectId, teacherId: teacherAId, academicYearId, termId, dayOfWeek: DayOfWeek.MONDAY, timeSlotId },
      });

      const otherGrade = await createTestGrade({ level: GradeLevel.GRADE_9, sequence: 9 });
      const otherClass = await createTestClass(otherGrade.id);

      await expect(
        prisma.secondaryTimetable.create({
          data: { classId: otherClass.id, subjectId, teacherId: teacherAId, academicYearId, termId, dayOfWeek: DayOfWeek.MONDAY, timeSlotId },
        })
      ).rejects.toThrow();
    });

    it("requires termId", async () => {
      const { status } = await callRoute(detectClashes, {
        url: "/api/timetables/detect-clashes",
        token: teacherToken,
      });
      expect(status).toBe(400);
    });
  });

  describe("GET /api/timetables/suggestions", () => {
    it("available-teachers excludes a teacher already booked in that slot", async () => {
      await assignSubjectTeacher(teacherAId, subjectId, classId, academicYearId);

      const beforeBooking = await callRoute<{ data: { availableTeachers: { id: string }[] } }>(
        getSuggestions,
        {
          url: `/api/timetables/suggestions?type=available-teachers&termId=${termId}&dayOfWeek=${DayOfWeek.MONDAY}&timeSlotId=${timeSlotId}&classId=${classId}&subjectId=${subjectId}`,
          token: teacherToken,
        }
      );
      expect(beforeBooking.status).toBe(200);
      expect(beforeBooking.json.data.availableTeachers.map((t) => t.id)).toContain(teacherAId);

      await prisma.secondaryTimetable.create({
        data: { classId, subjectId, teacherId: teacherAId, academicYearId, termId, dayOfWeek: DayOfWeek.MONDAY, timeSlotId },
      });

      const afterBooking = await callRoute<{ data: { availableTeachers: { id: string }[] } }>(
        getSuggestions,
        {
          url: `/api/timetables/suggestions?type=available-teachers&termId=${termId}&dayOfWeek=${DayOfWeek.MONDAY}&timeSlotId=${timeSlotId}&classId=${classId}&subjectId=${subjectId}`,
          token: teacherToken,
        }
      );
      expect(afterBooking.json.data.availableTeachers.map((t) => t.id)).not.toContain(teacherAId);
    });

    it("available-timeslots excludes a slot the teacher is already booked in", async () => {
      await prisma.secondaryTimetable.create({
        data: { classId, subjectId, teacherId: teacherAId, academicYearId, termId, dayOfWeek: DayOfWeek.TUESDAY, timeSlotId },
      });

      const { status, json } = await callRoute<{ data: { availableSlots: { id: string }[] } }>(
        getSuggestions,
        {
          url: `/api/timetables/suggestions?type=available-timeslots&termId=${termId}&dayOfWeek=${DayOfWeek.TUESDAY}&teacherId=${teacherAId}&classId=${classId}`,
          token: teacherToken,
        }
      );
      expect(status).toBe(200);
      expect(json.data.availableSlots.map((s) => s.id)).not.toContain(timeSlotId);
    });

    it("requires type, termId, and dayOfWeek", async () => {
      const { status } = await callRoute(getSuggestions, {
        url: "/api/timetables/suggestions",
        token: teacherToken,
      });
      expect(status).toBe(400);
    });
  });
});
