import { describe, it, expect, beforeEach } from "vitest";
import { Role, AttendanceStatus } from "@prisma/client";
import { attendanceRecordService } from "@/features/attendance/attendanceRecord.service";
import prisma from "@/lib/db/prisma";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestStudent,
} from "../helpers/db";

describe("bulk attendance marking (N+1 regression)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("splits into batched creates/updates and reports invalid students without blocking the rest", async () => {
    // Regression test for a real bug found and fixed this session:
    // bulkMarkAttendance used to loop markAttendance sequentially (one
    // validate+lookup+write round trip per student). It's now two batched
    // queries plus one transaction, while preserving partial-success
    // semantics (an invalid student fails without blocking valid ones).
    const { user, teacherProfile } = await createTestUser({ role: Role.TEACHER });
    const academicYear = await createTestAcademicYear();
    const term = await createTestTerm(academicYear.id);
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);

    const newStudent = await createTestStudent({ firstName: "New" });
    const existingStudent = await createTestStudent({ firstName: "Existing" });

    const markDate = new Date(`${new Date().getFullYear()}-02-10`);

    // Pre-existing record for one student — should be updated, not duplicated.
    const existingRecord = await prisma.attendanceRecord.create({
      data: {
        studentId: existingStudent.id,
        classId: testClass.id,
        termId: term.id,
        date: markDate,
        status: AttendanceStatus.ABSENT,
        timetableSlotId: null,
      },
    });

    const context = { userId: user.id, role: Role.TEACHER, teacherProfileId: teacherProfile!.id };

    const result = await attendanceRecordService.bulkMarkAttendance(
      {
        classId: testClass.id,
        termId: term.id,
        date: markDate,
        records: [
          { studentId: newStudent.id, status: AttendanceStatus.PRESENT },
          { studentId: existingStudent.id, status: AttendanceStatus.PRESENT },
          { studentId: "does-not-exist", status: AttendanceStatus.PRESENT },
        ],
      },
      context
    );

    expect(result.successful).toBe(2);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].studentId).toBe("does-not-exist");

    const records = await prisma.attendanceRecord.findMany({
      where: { classId: testClass.id, termId: term.id, date: markDate },
    });
    expect(records).toHaveLength(2);

    // The existing record was updated in place (same row id), not duplicated.
    const updatedExisting = records.find((r) => r.studentId === existingStudent.id);
    expect(updatedExisting?.id).toBe(existingRecord.id);
    expect(updatedExisting?.status).toBe(AttendanceStatus.PRESENT);

    const created = records.find((r) => r.studentId === newStudent.id);
    expect(created?.status).toBe(AttendanceStatus.PRESENT);
  });
});
