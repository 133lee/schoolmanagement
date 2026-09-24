import { describe, it, expect, beforeEach } from "vitest";
import { Role, AttendanceStatus, DayOfWeek } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { POST as generateReportCard } from "@/app/api/report-cards/route";
import { summarizeAttendance } from "@/features/attendance/attendance-summary";
import { formatAttendanceLabel } from "@/lib/report-cards/attendance-label";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestStudent,
  createTestSubject,
  createTestClassSubject,
  createTestTimetableSlot,
  enrollTestStudent,
} from "../helpers/db";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("summarizeAttendance", () => {
  it("counts DAYS, not rows — several period rows on one date are one day", () => {
    const rows = [
      { date: d("2026-01-12"), status: AttendanceStatus.PRESENT },
      { date: d("2026-01-12"), status: AttendanceStatus.PRESENT },
      { date: d("2026-01-12"), status: AttendanceStatus.PRESENT },
    ];
    expect(summarizeAttendance(rows)).toEqual({ totalDays: 1, daysPresent: 1, daysAbsent: 0 });
  });

  it("counts a day as present if ANY record that day is PRESENT or LATE", () => {
    const mixed = [
      { date: d("2026-01-12"), status: AttendanceStatus.ABSENT },
      { date: d("2026-01-12"), status: AttendanceStatus.PRESENT },
    ];
    expect(summarizeAttendance(mixed).daysPresent).toBe(1);

    const late = [{ date: d("2026-01-12"), status: AttendanceStatus.LATE }];
    expect(summarizeAttendance(late)).toEqual({ totalDays: 1, daysPresent: 1, daysAbsent: 0 });
  });

  it("counts ABSENT and EXCUSED-only days as absent, so present + absent always equals total", () => {
    const rows = [
      { date: d("2026-01-12"), status: AttendanceStatus.ABSENT },
      { date: d("2026-01-13"), status: AttendanceStatus.EXCUSED },
      { date: d("2026-01-14"), status: AttendanceStatus.PRESENT },
    ];
    const s = summarizeAttendance(rows);
    expect(s).toEqual({ totalDays: 3, daysPresent: 1, daysAbsent: 2 });
    expect(s.daysPresent + s.daysAbsent).toBe(s.totalDays);
  });

  it("returns zeros when there are no records", () => {
    expect(summarizeAttendance([])).toEqual({ totalDays: 0, daysPresent: 0, daysAbsent: 0 });
  });
});

describe("formatAttendanceLabel", () => {
  it("prints days present out of days recorded, with a rounded percentage", () => {
    expect(formatAttendanceLabel({ daysPresent: 46, daysAbsent: 4 })).toBe("46 of 50 days (92%)");
    expect(formatAttendanceLabel({ daysPresent: 2, daysAbsent: 1 })).toBe("2 of 3 days (67%)");
    expect(formatAttendanceLabel({ daysPresent: 0, daysAbsent: 5 })).toBe("0 of 5 days (0%)");
  });

  it("prints a dash — not a misleading 0% — when nothing was recorded", () => {
    expect(formatAttendanceLabel({ daysPresent: 0, daysAbsent: 0 })).toBe("-");
    expect(formatAttendanceLabel({})).toBe("-");
    expect(formatAttendanceLabel(null)).toBe("-");
    expect(formatAttendanceLabel(undefined)).toBe("-");
  });
});

describe("report card generation — attendance", () => {
  let adminToken: string;
  let teacherProfileId: string;
  let academicYearId: string;
  let termId: string;
  let classId: string;
  let subjectId: string;

  beforeEach(async () => {
    await resetDb();
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherProfileId = teacher.teacherProfile!.id;
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);

    const academicYear = await createTestAcademicYear();
    academicYearId = academicYear.id;
    const term = await createTestTerm(academicYear.id);
    termId = term.id;
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    classId = testClass.id;
    const subject = await createTestSubject();
    subjectId = subject.id;
    await createTestClassSubject(classId, subjectId);
  });

  it("uses only the class teacher's DAILY register — period registers are ignored, and can't overrule it either way", async () => {
    const student = await createTestStudent();
    await enrollTestStudent(student.id, classId, (await createTestAcademicYear({ year: 3000 })).id);

    // Three timetable slots on the same weekday, so period rows can exist
    // alongside the daily register on the same date.
    const slots = [];
    for (const periodNumber of [1, 2, 3]) {
      slots.push(
        await createTestTimetableSlot(classId, subjectId, teacherProfileId, academicYearId, {
          dayOfWeek: DayOfWeek.MONDAY,
          periodNumber,
          startTime: `0${7 + periodNumber}:00`,
          endTime: `0${7 + periodNumber}:40`,
        })
      );
    }

    const mark = (date: string, status: AttendanceStatus, timetableSlotId?: string) =>
      prisma.attendanceRecord.create({
        data: {
          studentId: student.id,
          classId,
          termId,
          date: d(date),
          status,
          timetableSlotId: timetableSlotId ?? null,
        },
      });

    // 12th, 13th: period rows ONLY (no daily register that day) — must not count at all.
    await mark("2026-01-12", AttendanceStatus.PRESENT, slots[0].id);
    await mark("2026-01-12", AttendanceStatus.PRESENT, slots[1].id);
    await mark("2026-01-12", AttendanceStatus.PRESENT, slots[2].id);
    await mark("2026-01-13", AttendanceStatus.ABSENT, slots[0].id);
    // 14th: daily PRESENT, but a subject teacher marked one lesson absent  -> present day
    await mark("2026-01-14", AttendanceStatus.PRESENT);
    await mark("2026-01-14", AttendanceStatus.ABSENT, slots[0].id);
    // 15th: daily ABSENT, but a subject teacher marked one lesson present -> absent day
    await mark("2026-01-15", AttendanceStatus.ABSENT);
    await mark("2026-01-15", AttendanceStatus.PRESENT, slots[1].id);
    // 16th: daily LATE                                                    -> present day
    await mark("2026-01-16", AttendanceStatus.LATE);
    // 19th: daily EXCUSED                                                 -> absent day
    await mark("2026-01-19", AttendanceStatus.EXCUSED);

    expect(await prisma.attendanceRecord.count({ where: { studentId: student.id } })).toBe(10);

    const created = await callRoute(generateReportCard, {
      method: "POST",
      url: "/api/report-cards",
      token: adminToken,
      body: { studentId: student.id, classId, termId, classTeacherId: teacherProfileId },
    });
    expect(created.status).toBe(201);

    const card = await prisma.reportCard.findUniqueOrThrow({
      where: { studentId_termId: { studentId: student.id, termId } },
    });
    // 10 raw rows across 6 dates, but only 4 dates have a daily register entry:
    // 14th + 16th present, 15th + 19th absent.
    expect(card.attendance).toBe(4);
    expect(card.daysPresent).toBe(2);
    expect(card.daysAbsent).toBe(2);

    expect(formatAttendanceLabel(card)).toBe("2 of 4 days (50%)");
  });

  it("a student with only period attendance and no daily register entries has no report card attendance", async () => {
    const student = await createTestStudent();
    await enrollTestStudent(student.id, classId, (await createTestAcademicYear({ year: 3000 })).id);
    const slot = await createTestTimetableSlot(classId, subjectId, teacherProfileId, academicYearId, {
      dayOfWeek: DayOfWeek.MONDAY,
      periodNumber: 1,
    });
    await prisma.attendanceRecord.create({
      data: {
        studentId: student.id,
        classId,
        termId,
        date: d("2026-01-12"),
        status: AttendanceStatus.PRESENT,
        timetableSlotId: slot.id,
      },
    });

    const created = await callRoute(generateReportCard, {
      method: "POST",
      url: "/api/report-cards",
      token: adminToken,
      body: { studentId: student.id, classId, termId, classTeacherId: teacherProfileId },
    });
    expect(created.status).toBe(201);

    const card = await prisma.reportCard.findUniqueOrThrow({
      where: { studentId_termId: { studentId: student.id, termId } },
    });
    expect(card).toMatchObject({ attendance: 0, daysPresent: 0, daysAbsent: 0 });
    expect(formatAttendanceLabel(card)).toBe("-");
  });

  it("stores zeros — which print as a dash — for a student with no attendance records", async () => {
    const student = await createTestStudent();
    await enrollTestStudent(student.id, classId, (await createTestAcademicYear({ year: 3000 })).id);

    const created = await callRoute(generateReportCard, {
      method: "POST",
      url: "/api/report-cards",
      token: adminToken,
      body: { studentId: student.id, classId, termId, classTeacherId: teacherProfileId },
    });
    expect(created.status).toBe(201);

    const card = await prisma.reportCard.findUniqueOrThrow({
      where: { studentId_termId: { studentId: student.id, termId } },
    });
    expect(card).toMatchObject({ attendance: 0, daysPresent: 0, daysAbsent: 0 });
    expect(formatAttendanceLabel(card)).toBe("-");
  });
});
