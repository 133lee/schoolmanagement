import { describe, it, expect, beforeEach } from "vitest";
import { Role, Gender, StudentStatus } from "@prisma/client";
import { GET as listStudents, POST as createStudent } from "@/app/api/students/route";
import {
  GET as getStudent,
  PATCH as updateStudent,
  DELETE as deleteStudent,
} from "@/app/api/students/[id]/route";
import { GET as getStudentEnrollments } from "@/app/api/students/[id]/enrollments/route";
import { GET as getStudentPerformance } from "@/app/api/students/[id]/performance/route";
import { PATCH as changeStudentStatus } from "@/app/api/students/[id]/status/route";
import { POST as withdrawStudent } from "@/app/api/students/[id]/withdraw/route";
import { POST as importStudents } from "@/app/api/students/import/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestStudent,
  createTestAcademicYear,
  createTestGrade,
  createTestClass,
  enrollTestStudent,
} from "../helpers/db";

describe("students routes", () => {
  let clerkToken: string;
  let adminToken: string;

  beforeEach(async () => {
    await resetDb();
    const clerk = await createTestUser({ role: Role.CLERK });
    clerkToken = await loginAs(clerk.user.email, clerk.password);
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
  });

  it("supports the full create/list/get/update lifecycle", async () => {
    const created = await callRoute<{ data: { id: string; firstName: string } }>(createStudent, {
      method: "POST",
      url: "/api/students",
      token: clerkToken,
      body: {
        studentNumber: "STU-2026-0001",
        firstName: "Jane",
        lastName: "Doe",
        gender: Gender.FEMALE,
        dateOfBirth: "2012-01-01",
        admissionDate: "2024-01-01",
      },
    });
    expect(created.status).toBe(201);
    const studentId = created.json.data.id;

    const list = await callRoute<{ data: { id: string }[] }>(listStudents, {
      url: "/api/students",
      token: clerkToken,
    });
    expect(list.status).toBe(200);
    expect(list.json.data.map((s) => s.id)).toContain(studentId);

    const listAll = await callRoute<{ data: { id: string }[] }>(listStudents, {
      url: "/api/students?mode=all",
      token: clerkToken,
    });
    expect(listAll.status).toBe(200);
    expect(listAll.json.data.map((s) => s.id)).toContain(studentId);

    const fetched = await callRoute<{ data: { id: string } }>(getStudent, {
      url: `/api/students/${studentId}`,
      token: clerkToken,
      params: { id: studentId },
    });
    expect(fetched.status).toBe(200);

    const updated = await callRoute<{ data: { firstName: string } }>(updateStudent, {
      method: "PATCH",
      url: `/api/students/${studentId}`,
      token: clerkToken,
      params: { id: studentId },
      body: { firstName: "Janet" },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.firstName).toBe("Janet");
  });

  it("rejects an invalid student number format", async () => {
    const { status } = await callRoute(createStudent, {
      method: "POST",
      url: "/api/students",
      token: clerkToken,
      body: {
        studentNumber: "not-a-valid-format",
        firstName: "Jane",
        lastName: "Doe",
        gender: Gender.FEMALE,
        dateOfBirth: "2012-01-01",
        admissionDate: "2024-01-01",
      },
    });
    expect(status).toBe(400);
  });

  it("only ADMIN can hard-delete a student", async () => {
    const student = await createTestStudent();

    const deniedDelete = await callRoute(deleteStudent, {
      method: "DELETE",
      url: `/api/students/${student.id}`,
      token: clerkToken,
      params: { id: student.id },
    });
    expect(deniedDelete.status).toBe(403);

    const deleted = await callRoute(deleteStudent, {
      method: "DELETE",
      url: `/api/students/${student.id}`,
      token: adminToken,
      params: { id: student.id },
    });
    expect(deleted.status).toBe(200);
  });

  it("changes student status, but cannot change a GRADUATED student's status", async () => {
    const student = await createTestStudent();

    const changed = await callRoute<{ data: { status: string } }>(changeStudentStatus, {
      method: "PATCH",
      url: `/api/students/${student.id}/status`,
      token: clerkToken,
      params: { id: student.id },
      body: { status: StudentStatus.SUSPENDED },
    });
    expect(changed.status).toBe(200);
    expect(changed.json.data.status).toBe(StudentStatus.SUSPENDED);

    await callRoute(changeStudentStatus, {
      method: "PATCH",
      url: `/api/students/${student.id}/status`,
      token: clerkToken,
      params: { id: student.id },
      body: { status: StudentStatus.GRADUATED },
    });

    const { status } = await callRoute(changeStudentStatus, {
      method: "PATCH",
      url: `/api/students/${student.id}/status`,
      token: clerkToken,
      params: { id: student.id },
      body: { status: StudentStatus.ACTIVE },
    });
    expect(status).toBe(400);
  });

  it("withdraws a student (soft delete to WITHDRAWN status)", async () => {
    const student = await createTestStudent();

    const { status, json } = await callRoute<{ data: { status: string } }>(withdrawStudent, {
      method: "POST",
      url: `/api/students/${student.id}/withdraw`,
      token: clerkToken,
      params: { id: student.id },
    });
    expect(status).toBe(200);
    expect(json.data.status).toBe(StudentStatus.WITHDRAWN);
  });

  it("GET /api/students/[id]/enrollments returns enrollment history", async () => {
    const student = await createTestStudent();
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    await enrollTestStudent(student.id, testClass.id, academicYear.id);

    const { status, json } = await callRoute<{ data: { classId: string }[] }>(getStudentEnrollments, {
      url: `/api/students/${student.id}/enrollments`,
      token: clerkToken,
      params: { id: student.id },
    });
    expect(status).toBe(200);
    expect(json.data.map((e) => e.classId)).toContain(testClass.id);
  });

  it("GET /api/students/[id]/performance returns a result for an enrolled student", async () => {
    const student = await createTestStudent();
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    await enrollTestStudent(student.id, testClass.id, academicYear.id);

    const { status } = await callRoute(getStudentPerformance, {
      url: `/api/students/${student.id}/performance?classId=${testClass.id}&academicYearId=${academicYear.id}`,
      token: clerkToken,
      params: { id: student.id },
    });
    expect(status).toBe(200);
  });

  describe("POST /api/students/import", () => {
    it("bulk-imports valid rows and reports errors for invalid ones without blocking the rest", async () => {
      const { status, json } = await callRoute<{
        data: { successful: number; failed: number; errors: unknown[] };
      }>(importStudents, {
        method: "POST",
        url: "/api/students/import",
        token: clerkToken,
        body: {
          rows: [
            {
              firstName: "Valid",
              lastName: "Student",
              gender: "MALE",
              dateOfBirth: "2012-01-01",
              admissionDate: "2024-01-01",
            },
            { firstName: "", lastName: "", gender: "INVALID", dateOfBirth: "", admissionDate: "" },
          ],
        },
      });
      expect(status).toBe(200);
      expect(json.data.successful).toBe(1);
      expect(json.data.failed).toBe(1);
      expect(json.data.errors).toHaveLength(1);
    });

    it("rejects an empty rows array", async () => {
      const { status } = await callRoute(importStudents, {
        method: "POST",
        url: "/api/students/import",
        token: clerkToken,
        body: { rows: [] },
      });
      expect(status).toBe(400);
    });

    it("rejects more than 500 rows", async () => {
      const rows = Array.from({ length: 501 }, (_, i) => ({
        firstName: `S${i}`,
        lastName: "Test",
        gender: "MALE",
        dateOfBirth: "2012-01-01",
        admissionDate: "2024-01-01",
      }));

      const { status } = await callRoute(importStudents, {
        method: "POST",
        url: "/api/students/import",
        token: clerkToken,
        body: { rows },
      });
      expect(status).toBe(400);
    });
  });
});
