import { describe, it, expect, beforeEach } from "vitest";
import { Role, DayOfWeek } from "@prisma/client";
import { lessonLogService } from "@/features/lesson-logs/lessonLog.service";
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

const DAY_MAP: Record<number, DayOfWeek> = {
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
};

// Matches how the real frontend builds attendance dates (toDateStr + a
// date-only string parse, or Date.UTC directly from local Y/M/D) — UTC
// midnight of the literal calendar date, NOT local midnight re-read as UTC
// (those differ once the server's local offset isn't UTC+0).
function nextMonday(from: Date): Date {
  const d = new Date(from);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

describe("lesson logs and the derived remedial view", () => {
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
    const present = await createTestStudent({ firstName: "Present" });
    const absent = await createTestStudent({ firstName: "Absent" });
    await enrollTestStudent(present.id, testClass.id, academicYear.id);
    await enrollTestStudent(absent.id, testClass.id, academicYear.id);

    const monday = nextMonday(term.startDate);
    const slot = await createTestTimetableSlot(
      testClass.id,
      subject.id,
      owner.teacherProfile!.id,
      academicYear.id,
      { dayOfWeek: DAY_MAP[monday.getDay()] }
    );

    const context = { userId: owner.user.id, role: Role.TEACHER };
    await attendanceRecordService.bulkMarkAttendance(
      {
        classId: testClass.id,
        termId: term.id,
        date: monday,
        timetableSlotId: slot.id,
        records: [
          { studentId: present.id, status: "PRESENT" },
          { studentId: absent.id, status: "ABSENT" },
        ],
      },
      context
    );

    return { owner, other, slot, monday, present, absent, context };
  }

  it("upserts on a second call instead of creating a duplicate", async () => {
    const { slot, monday, context } = await setup();

    const first = await lessonLogService.logLesson(
      { timetableSlotId: slot.id, date: monday, topic: "Photosynthesis" },
      context
    );
    const second = await lessonLogService.logLesson(
      { timetableSlotId: slot.id, date: monday, topic: "Photosynthesis", subtopics: "Light-dependent reactions" },
      context
    );

    expect(second.id).toBe(first.id);
    expect(second.subtopics).toBe("Light-dependent reactions");
  });

  it("rejects a non-owning teacher logging a lesson for someone else's slot", async () => {
    const { other, slot, monday } = await setup();
    const otherContext = { userId: other.user.id, role: Role.TEACHER };

    await expect(
      lessonLogService.logLesson(
        { timetableSlotId: slot.id, date: monday, topic: "Photosynthesis" },
        otherContext
      )
    ).rejects.toThrow(/not on your timetable/i);
  });

  it("returns the logged topic and only the ABSENT student once both exist", async () => {
    const { slot, monday, absent, context } = await setup();

    await lessonLogService.logLesson(
      { timetableSlotId: slot.id, date: monday, topic: "Photosynthesis" },
      context
    );

    const view = await lessonLogService.getRemedialView(slot.id, monday, context);

    expect(view.log?.topic).toBe("Photosynthesis");
    expect(view.absentees).toHaveLength(1);
    expect(view.absentees[0].id).toBe(absent.id);
  });

  it("returns no log and no absentees when nothing has been logged", async () => {
    const { slot, monday, context } = await setup();

    const view = await lessonLogService.getRemedialView(slot.id, monday, context);

    expect(view.log).toBeNull();
  });

  it("getRemedialViewForExport rejects when no lesson has been logged yet", async () => {
    const { slot, monday, context } = await setup();

    await expect(
      lessonLogService.getRemedialViewForExport(slot.id, monday, context)
    ).rejects.toThrow(/log this lesson/i);
  });
});
