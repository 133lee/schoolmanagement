import { describe, it, expect, beforeEach } from "vitest";
import { Role, DayOfWeek } from "@prisma/client";
import { attendanceRecordService } from "@/features/attendance/attendanceRecord.service";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestStudent,
  createTestSubject,
  createTestTimetableSlot,
  enrollTestStudent,
} from "../helpers/db";

// Only Mon–Fri map to a DayOfWeek — matches JS_DAY_TO_DAYOFWEEK in
// lib/timetable/verify-slot-ownership.ts.
const DAY_MAP: Record<number, DayOfWeek> = {
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
};

// Matches how the real frontend builds attendance dates — UTC midnight of
// the literal calendar date, not local midnight re-read as UTC (those
// differ once the server's local offset isn't UTC+0).
function nextWeekday(from: Date, targetDow: number): Date {
  const d = new Date(from);
  while (d.getDay() !== targetDow) d.setDate(d.getDate() + 1);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

describe("period attendance scheduling check", () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function setup() {
    const owner = await createTestUser({ role: Role.TEACHER });
    const other = await createTestUser({ role: Role.TEACHER });

    const academicYear = await createTestAcademicYear();
    const term = await createTestTerm(academicYear.id);
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    const subject = await createTestSubject();
    const student = await createTestStudent();
    await enrollTestStudent(student.id, testClass.id, academicYear.id);

    const monday = nextWeekday(term.startDate, 1);
    const tuesday = nextWeekday(new Date(monday.getTime() + 86400000), 2);

    const slot = await createTestTimetableSlot(
      testClass.id,
      subject.id,
      owner.teacherProfile!.id,
      academicYear.id,
      { dayOfWeek: DAY_MAP[monday.getDay()] }
    );

    return { owner, other, term, testClass, student, slot, monday, tuesday };
  }

  it("lets the owning teacher mark attendance for their own slot on the correct day", async () => {
    const { owner, term, testClass, student, slot, monday } = await setup();
    const context = { userId: owner.user.id, role: Role.TEACHER };

    await expect(
      attendanceRecordService.markAttendance(
        {
          studentId: student.id,
          classId: testClass.id,
          termId: term.id,
          date: monday,
          status: "PRESENT",
          timetableSlotId: slot.id,
        },
        context
      )
    ).resolves.toBeDefined();
  });

  it("rejects a teacher marking attendance for a slot that isn't theirs", async () => {
    const { other, term, testClass, student, slot, monday } = await setup();
    const context = { userId: other.user.id, role: Role.TEACHER };

    await expect(
      attendanceRecordService.markAttendance(
        {
          studentId: student.id,
          classId: testClass.id,
          termId: term.id,
          date: monday,
          status: "PRESENT",
          timetableSlotId: slot.id,
        },
        context
      )
    ).rejects.toThrow(/not on your timetable/i);
  });

  it("rejects a date that doesn't match the slot's scheduled day", async () => {
    const { owner, term, testClass, student, slot, tuesday } = await setup();
    const context = { userId: owner.user.id, role: Role.TEACHER };

    await expect(
      attendanceRecordService.markAttendance(
        {
          studentId: student.id,
          classId: testClass.id,
          termId: term.id,
          date: tuesday,
          status: "PRESENT",
          timetableSlotId: slot.id,
        },
        context
      )
    ).rejects.toThrow(/does not match the scheduled day/i);
  });

  it("bulkMarkAttendance applies the same ownership check", async () => {
    const { other, term, testClass, student, slot, monday } = await setup();
    const context = { userId: other.user.id, role: Role.TEACHER };

    await expect(
      attendanceRecordService.bulkMarkAttendance(
        {
          classId: testClass.id,
          termId: term.id,
          date: monday,
          timetableSlotId: slot.id,
          records: [{ studentId: student.id, status: "PRESENT" }],
        },
        context
      )
    ).rejects.toThrow(/not on your timetable/i);
  });

  it("does not affect the daily register (no timetableSlotId)", async () => {
    const { other, term, testClass, student, monday } = await setup();
    const context = { userId: other.user.id, role: Role.TEACHER };

    await expect(
      attendanceRecordService.markAttendance(
        {
          studentId: student.id,
          classId: testClass.id,
          termId: term.id,
          date: monday,
          status: "PRESENT",
          timetableSlotId: null,
        },
        context
      )
    ).resolves.toBeDefined();
  });
});
