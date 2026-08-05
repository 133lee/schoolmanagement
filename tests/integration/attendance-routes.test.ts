import { describe, it, expect, beforeEach } from "vitest";
import { Role, AttendanceStatus } from "@prisma/client";
import { GET as listAttendance, POST as markAttendance } from "@/app/api/attendance/route";
import {
  GET as getAttendance,
  PATCH as updateAttendance,
  DELETE as deleteAttendance,
} from "@/app/api/attendance/[id]/route";
import { GET as getClassAttendance } from "@/app/api/attendance/class/[classId]/route";
import { GET as getPeriodAttendance } from "@/app/api/attendance/period/route";
import { GET as getAttendanceReport } from "@/app/api/attendance/reports/route";
import { GET as getStudentAttendance } from "@/app/api/attendance/student/[studentId]/route";
import { GET as getStudentAttendanceStats } from "@/app/api/attendance/student/[studentId]/stats/route";
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
} from "../helpers/db";

// Route-level coverage. The N+1 regression test (tests/integration/bulk-attendance.test.ts)
// calls attendanceRecordService.bulkMarkAttendance() directly to isolate the
// batching behavior — it never invokes app/api/attendance/route.ts, so these
// tests are what prove withAuth → route → service → ApiResponse wiring here.
describe("attendance routes", () => {
  let teacherToken: string;
  let headTeacherToken: string;
  let termId: string;
  let classId: string;
  let studentId: string;
  const markDate = `${new Date().getFullYear()}-02-10`;

  beforeEach(async () => {
    await resetDb();
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
    const headTeacher = await createTestUser({ role: Role.HEAD_TEACHER });
    headTeacherToken = await loginAs(headTeacher.user.email, headTeacher.password);

    const academicYear = await createTestAcademicYear();
    const term = await createTestTerm(academicYear.id, {
      startDate: new Date(`${new Date().getFullYear()}-01-01`),
      endDate: new Date(`${new Date().getFullYear()}-04-30`),
    });
    termId = term.id;
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    classId = testClass.id;
    const student = await createTestStudent();
    studentId = student.id;
  });

  it("supports the full mark/list/get/update/delete lifecycle", async () => {
    const marked = await callRoute<{ data: { id: string; status: string } }>(markAttendance, {
      method: "POST",
      url: "/api/attendance",
      token: teacherToken,
      body: { studentId, classId, termId, date: markDate, status: AttendanceStatus.PRESENT },
    });
    expect(marked.status).toBe(201);
    expect(marked.json.data.status).toBe(AttendanceStatus.PRESENT);
    const recordId = marked.json.data.id;

    const list = await callRoute<{ data: { id: string }[] }>(listAttendance, {
      url: `/api/attendance?classId=${classId}`,
      token: teacherToken,
    });
    expect(list.status).toBe(200);
    expect(list.json.data.map((r) => r.id)).toContain(recordId);

    const fetched = await callRoute<{ data: { id: string } }>(getAttendance, {
      url: `/api/attendance/${recordId}`,
      token: teacherToken,
      params: { id: recordId },
    });
    expect(fetched.status).toBe(200);

    const updated = await callRoute<{ data: { status: string } }>(updateAttendance, {
      method: "PATCH",
      url: `/api/attendance/${recordId}`,
      token: teacherToken,
      params: { id: recordId },
      body: { status: AttendanceStatus.LATE },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.status).toBe(AttendanceStatus.LATE);

    // Delete requires HEAD_TEACHER+ — a plain TEACHER is rejected first.
    const deniedDelete = await callRoute(deleteAttendance, {
      method: "DELETE",
      url: `/api/attendance/${recordId}`,
      token: teacherToken,
      params: { id: recordId },
    });
    expect(deniedDelete.status).toBe(403);

    const deleted = await callRoute(deleteAttendance, {
      method: "DELETE",
      url: `/api/attendance/${recordId}`,
      token: headTeacherToken,
      params: { id: recordId },
    });
    expect(deleted.status).toBe(204);
  });

  it("marks bulk attendance for a class and reports partial failures", async () => {
    const studentB = await createTestStudent({ firstName: "B" });

    const { status, json } = await callRoute<{ data: { successful: number; failed: unknown[] } }>(
      markAttendance,
      {
        method: "POST",
        url: "/api/attendance",
        token: teacherToken,
        body: {
          classId,
          termId,
          date: markDate,
          records: [
            { studentId, status: AttendanceStatus.PRESENT },
            { studentId: studentB.id, status: AttendanceStatus.ABSENT },
            { studentId: "does-not-exist", status: AttendanceStatus.PRESENT },
          ],
        },
      }
    );

    expect(status).toBe(201);
    expect(json.data.successful).toBe(2);
    expect(json.data.failed).toHaveLength(1);
  });

  it("rejects marking attendance for a future date", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const { status } = await callRoute(markAttendance, {
      method: "POST",
      url: "/api/attendance",
      token: teacherToken,
      body: {
        studentId,
        classId,
        termId,
        date: futureDate.toISOString().slice(0, 10),
        status: AttendanceStatus.PRESENT,
      },
    });
    expect(status).toBe(400);
  });

  it("returns 400 for a mark request missing required fields", async () => {
    const { status } = await callRoute(markAttendance, {
      method: "POST",
      url: "/api/attendance",
      token: teacherToken,
      body: { studentId },
    });
    expect(status).toBe(400);
  });

  it("GET /api/attendance/class/[classId] requires a date and returns the day's records", async () => {
    await callRoute(markAttendance, {
      method: "POST",
      url: "/api/attendance",
      token: teacherToken,
      body: { studentId, classId, termId, date: markDate, status: AttendanceStatus.PRESENT },
    });

    const missingDate = await callRoute(getClassAttendance, {
      url: `/api/attendance/class/${classId}`,
      token: teacherToken,
      params: { classId },
    });
    expect(missingDate.status).toBe(400);

    const { status, json } = await callRoute<{ data: { studentId: string }[] }>(getClassAttendance, {
      url: `/api/attendance/class/${classId}?date=${markDate}`,
      token: teacherToken,
      params: { classId },
    });
    expect(status).toBe(200);
    expect(json.data.map((r) => r.studentId)).toContain(studentId);
  });

  it("GET /api/attendance/period validates timetableSlotId, date presence and date format", async () => {
    const missingParams = await callRoute(getPeriodAttendance, {
      url: "/api/attendance/period",
      token: teacherToken,
    });
    expect(missingParams.status).toBe(400);

    const badDate = await callRoute(getPeriodAttendance, {
      url: "/api/attendance/period?timetableSlotId=x&date=not-a-date",
      token: teacherToken,
    });
    expect(badDate.status).toBe(400);
  });

  it("GET /api/attendance/reports requires classId/startDate/endDate and returns a summary", async () => {
    await callRoute(markAttendance, {
      method: "POST",
      url: "/api/attendance",
      token: teacherToken,
      body: { studentId, classId, termId, date: markDate, status: AttendanceStatus.PRESENT },
    });

    const missingParams = await callRoute(getAttendanceReport, {
      url: "/api/attendance/reports",
      token: teacherToken,
    });
    expect(missingParams.status).toBe(400);

    const { status } = await callRoute(getAttendanceReport, {
      url: `/api/attendance/reports?classId=${classId}&startDate=${markDate}&endDate=${markDate}`,
      token: teacherToken,
    });
    expect(status).toBe(200);
  });

  it("GET /api/attendance/student/[studentId] returns that student's history", async () => {
    await callRoute(markAttendance, {
      method: "POST",
      url: "/api/attendance",
      token: teacherToken,
      body: { studentId, classId, termId, date: markDate, status: AttendanceStatus.PRESENT },
    });

    const { status, json } = await callRoute<{ data: { studentId: string }[] }>(getStudentAttendance, {
      url: `/api/attendance/student/${studentId}`,
      token: teacherToken,
      params: { studentId },
    });
    expect(status).toBe(200);
    expect(json.data.every((r) => r.studentId === studentId)).toBe(true);
  });

  it("GET /api/attendance/student/[studentId]/stats requires termId and returns attendance/absentee rates", async () => {
    await callRoute(markAttendance, {
      method: "POST",
      url: "/api/attendance",
      token: teacherToken,
      body: { studentId, classId, termId, date: markDate, status: AttendanceStatus.PRESENT },
    });

    const missingTerm = await callRoute(getStudentAttendanceStats, {
      url: `/api/attendance/student/${studentId}/stats`,
      token: teacherToken,
      params: { studentId },
    });
    expect(missingTerm.status).toBe(400);

    const { status, json } = await callRoute<{ data: { attendanceRate: number; absenteeRate: number } }>(
      getStudentAttendanceStats,
      {
        url: `/api/attendance/student/${studentId}/stats?termId=${termId}`,
        token: teacherToken,
        params: { studentId },
      }
    );
    expect(status).toBe(200);
    expect(json.data.attendanceRate).toBe(100);
    expect(json.data.absenteeRate).toBe(0);
  });
});
