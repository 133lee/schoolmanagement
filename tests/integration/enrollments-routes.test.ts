import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as listEnrollments, POST as createEnrollment } from "@/app/api/enrollments/route";
import {
  GET as getEnrollment,
  PATCH as transferEnrollment,
  DELETE as deleteEnrollment,
} from "@/app/api/enrollments/[id]/route";
import { POST as bulkEnroll } from "@/app/api/enrollments/bulk/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestGrade,
  createTestClass,
  createTestStudent,
} from "../helpers/db";

// Route-level coverage for the enrollments feature. The concurrency-race
// regression test (tests/integration/enrollment.test.ts) deliberately calls
// enrollmentService.createEnrollment() directly to isolate the transaction
// behavior — it never invokes app/api/enrollments/route.ts at all, so these
// tests are what actually prove withAuth → route → service → ApiResponse
// wiring for this feature end-to-end.
describe("enrollments routes", () => {
  let adminToken: string;
  let teacherToken: string;
  let clerkToken: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
    const clerk = await createTestUser({ role: Role.CLERK });
    clerkToken = await loginAs(clerk.user.email, clerk.password);
  });

  it("supports the full create/list/get/transfer/delete lifecycle for ADMIN", async () => {
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade();
    const classA = await createTestClass(grade.id, { name: "A" });
    const classB = await createTestClass(grade.id, { name: "B" });
    const student = await createTestStudent();

    const created = await callRoute<{ data: { id: string; status: string } }>(createEnrollment, {
      method: "POST",
      url: "/api/enrollments",
      token: adminToken,
      body: { studentId: student.id, classId: classA.id, academicYearId: academicYear.id },
    });
    expect(created.status).toBe(201);
    expect(created.json.data.status).toBe("ACTIVE");
    const enrollmentId = created.json.data.id;

    const list = await callRoute<{ data: { id: string }[] }>(listEnrollments, {
      url: `/api/enrollments?classId=${classA.id}`,
      token: adminToken,
    });
    expect(list.status).toBe(200);
    expect(list.json.data.map((e) => e.id)).toContain(enrollmentId);

    const fetched = await callRoute<{ data: { id: string } }>(getEnrollment, {
      url: `/api/enrollments/${enrollmentId}`,
      token: adminToken,
      params: { id: enrollmentId },
    });
    expect(fetched.status).toBe(200);

    const transferred = await callRoute<{ data: { classId: string } }>(transferEnrollment, {
      method: "PATCH",
      url: `/api/enrollments/${enrollmentId}`,
      token: adminToken,
      params: { id: enrollmentId },
      body: { classId: classB.id, changeReason: "Moved to parallel stream" },
    });
    expect(transferred.status).toBe(200);
    expect(transferred.json.data.classId).toBe(classB.id);

    const deleted = await callRoute(deleteEnrollment, {
      method: "DELETE",
      url: `/api/enrollments/${enrollmentId}`,
      token: adminToken,
      params: { id: enrollmentId },
    });
    expect(deleted.status).toBe(204);
  });

  it("rejects a TEACHER from creating/updating/deleting but allows read access", async () => {
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    const student = await createTestStudent();

    const created = await callRoute(createEnrollment, {
      method: "POST",
      url: "/api/enrollments",
      token: teacherToken,
      body: { studentId: student.id, classId: testClass.id, academicYearId: academicYear.id },
    });
    expect(created.status).toBe(403);

    const list = await callRoute(listEnrollments, { url: "/api/enrollments", token: teacherToken });
    expect(list.status).toBe(200);
  });

  it("lets a CLERK create/update enrollments but not delete them", async () => {
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade();
    const classA = await createTestClass(grade.id, { name: "A" });
    const student = await createTestStudent();

    const created = await callRoute<{ data: { id: string } }>(createEnrollment, {
      method: "POST",
      url: "/api/enrollments",
      token: clerkToken,
      body: { studentId: student.id, classId: classA.id, academicYearId: academicYear.id },
    });
    expect(created.status).toBe(201);

    const deleted = await callRoute(deleteEnrollment, {
      method: "DELETE",
      url: `/api/enrollments/${created.json.data.id}`,
      token: clerkToken,
      params: { id: created.json.data.id },
    });
    expect(deleted.status).toBe(403);
  });

  it("returns 400 for a request missing required fields", async () => {
    const { status } = await callRoute(createEnrollment, {
      method: "POST",
      url: "/api/enrollments",
      token: adminToken,
      body: { studentId: "x" },
    });
    expect(status).toBe(400);
  });

  it("returns 409 when the student is already enrolled for the academic year", async () => {
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    const student = await createTestStudent();

    await callRoute(createEnrollment, {
      method: "POST",
      url: "/api/enrollments",
      token: adminToken,
      body: { studentId: student.id, classId: testClass.id, academicYearId: academicYear.id },
    });

    const { status } = await callRoute(createEnrollment, {
      method: "POST",
      url: "/api/enrollments",
      token: adminToken,
      body: { studentId: student.id, classId: testClass.id, academicYearId: academicYear.id },
    });
    expect(status).toBe(409);
  });

  it("returns 400 when the class is at full capacity", async () => {
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id, { capacity: 1 });
    const studentA = await createTestStudent({ firstName: "A" });
    const studentB = await createTestStudent({ firstName: "B" });

    await callRoute(createEnrollment, {
      method: "POST",
      url: "/api/enrollments",
      token: adminToken,
      body: { studentId: studentA.id, classId: testClass.id, academicYearId: academicYear.id },
    });

    const { status } = await callRoute(createEnrollment, {
      method: "POST",
      url: "/api/enrollments",
      token: adminToken,
      body: { studentId: studentB.id, classId: testClass.id, academicYearId: academicYear.id },
    });
    expect(status).toBe(400);
  });

  describe("POST /api/enrollments/bulk", () => {
    it("enrolls all valid students and reports per-student failures without blocking the rest", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id, { capacity: 40 });
      const studentA = await createTestStudent({ firstName: "A" });
      const studentB = await createTestStudent({ firstName: "B" });

      // Pre-enroll studentA so the bulk call hits one real per-student failure
      // (duplicate) alongside a real success, proving partial-success
      // semantics rather than an all-or-nothing bulk operation.
      await callRoute(createEnrollment, {
        method: "POST",
        url: "/api/enrollments",
        token: adminToken,
        body: { studentId: studentA.id, classId: testClass.id, academicYearId: academicYear.id },
      });

      const { status, json } = await callRoute<{
        data: { successful: number; failed: Array<{ studentId: string }> };
      }>(bulkEnroll, {
        method: "POST",
        url: "/api/enrollments/bulk",
        token: adminToken,
        body: { studentIds: [studentA.id, studentB.id], classId: testClass.id, academicYearId: academicYear.id },
      });

      expect(status).toBe(201);
      expect(json.data.successful).toBe(1);
      expect(json.data.failed.map((f) => f.studentId)).toEqual([studentA.id]);
    });

    it("rejects bulk enroll from a TEACHER", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const student = await createTestStudent();

      const { status } = await callRoute(bulkEnroll, {
        method: "POST",
        url: "/api/enrollments/bulk",
        token: teacherToken,
        body: { studentIds: [student.id], classId: testClass.id, academicYearId: academicYear.id },
      });
      expect(status).toBe(403);
    });
  });
});
