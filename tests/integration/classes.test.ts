import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as listClasses, POST as createClass } from "@/app/api/classes/route";
import { GET as getClass, PATCH as updateClass, DELETE as deleteClass } from "@/app/api/classes/[id]/route";
import { GET as getClassAssignments } from "@/app/api/classes/[id]/assignments/route";
import { POST as assignClassTeacher, DELETE as removeClassTeacher } from "@/app/api/classes/[id]/class-teacher/route";
import { GET as getEnrollmentStats } from "@/app/api/classes/[id]/enrollment-stats/route";
import { GET as getClassStudents } from "@/app/api/classes/[id]/students/route";
import { POST as importClasses } from "@/app/api/classes/import/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestGrade,
  createTestClass,
  createTestAcademicYear,
  createTestStudent,
  enrollTestStudent,
} from "../helpers/db";
import { GradeLevel } from "@prisma/client";

describe("classes routes", () => {
  let adminToken: string;
  let headTeacherToken: string;
  let teacherToken: string;
  let gradeId: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const headTeacher = await createTestUser({ role: Role.HEAD_TEACHER });
    headTeacherToken = await loginAs(headTeacher.user.email, headTeacher.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
    const grade = await createTestGrade();
    gradeId = grade.id;
  });

  it("supports the full create/list/get/update lifecycle for ADMIN/HEAD_TEACHER, rejects TEACHER", async () => {
    const deniedCreate = await callRoute(createClass, {
      method: "POST",
      url: "/api/classes",
      token: teacherToken,
      body: { gradeId, name: "X" },
    });
    expect(deniedCreate.status).toBe(403);

    const created = await callRoute<{ data: { id: string; name: string } }>(createClass, {
      method: "POST",
      url: "/api/classes",
      token: headTeacherToken,
      body: { gradeId, name: "X" },
    });
    expect(created.status).toBe(201);
    const classId = created.json.data.id;

    const list = await callRoute<{ data: { id: string }[] }>(listClasses, {
      url: `/api/classes?gradeId=${gradeId}`,
      token: teacherToken,
    });
    expect(list.status).toBe(200);
    expect(list.json.data.map((c) => c.id)).toContain(classId);

    const fetched = await callRoute<{ data: { id: string } }>(getClass, {
      url: `/api/classes/${classId}`,
      token: teacherToken,
      params: { id: classId },
    });
    expect(fetched.status).toBe(200);

    const updated = await callRoute<{ data: { capacity: number } }>(updateClass, {
      method: "PATCH",
      url: `/api/classes/${classId}`,
      token: headTeacherToken,
      params: { id: classId },
      body: { capacity: 45 },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.capacity).toBe(45);

    const deniedDelete = await callRoute(deleteClass, {
      method: "DELETE",
      url: `/api/classes/${classId}`,
      token: headTeacherToken,
      params: { id: classId },
    });
    expect(deniedDelete.status).toBe(403);

    const deleted = await callRoute(deleteClass, {
      method: "DELETE",
      url: `/api/classes/${classId}`,
      token: adminToken,
      params: { id: classId },
    });
    expect(deleted.status).toBe(200);
  });

  it("assigns and removes a class teacher, rejects a non-HOD TEACHER", async () => {
    await createTestAcademicYear({ isActive: true });
    const testClass = await createTestClass(gradeId);
    const teacherToAssign = await createTestUser({ role: Role.TEACHER });

    const deniedAssign = await callRoute(assignClassTeacher, {
      method: "POST",
      url: `/api/classes/${testClass.id}/class-teacher`,
      token: teacherToken,
      params: { id: testClass.id },
      body: { teacherId: teacherToAssign.teacherProfile!.id },
    });
    expect(deniedAssign.status).toBe(403);

    const assigned = await callRoute<{ data: { success: boolean } }>(assignClassTeacher, {
      method: "POST",
      url: `/api/classes/${testClass.id}/class-teacher`,
      token: headTeacherToken,
      params: { id: testClass.id },
      body: { teacherId: teacherToAssign.teacherProfile!.id },
    });
    expect(assigned.status).toBe(200);
    expect(assigned.json.data.success).toBe(true);

    const removed = await callRoute(removeClassTeacher, {
      method: "DELETE",
      url: `/api/classes/${testClass.id}/class-teacher`,
      token: headTeacherToken,
      params: { id: testClass.id },
    });
    expect(removed.status).toBe(200);
  });

  it("GET /api/classes/[id]/assignments returns subject-teacher assignments for the class", async () => {
    const testClass = await createTestClass(gradeId);

    const { status, json } = await callRoute<{ data: unknown[] }>(getClassAssignments, {
      url: `/api/classes/${testClass.id}/assignments`,
      token: teacherToken,
      params: { id: testClass.id },
    });
    expect(status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("GET /api/classes/[id]/enrollment-stats requires academicYearId and returns stats", async () => {
    const testClass = await createTestClass(gradeId);
    const academicYear = await createTestAcademicYear();

    const missingParam = await callRoute(getEnrollmentStats, {
      url: `/api/classes/${testClass.id}/enrollment-stats`,
      token: teacherToken,
      params: { id: testClass.id },
    });
    expect(missingParam.status).toBe(400);

    const { status } = await callRoute(getEnrollmentStats, {
      url: `/api/classes/${testClass.id}/enrollment-stats?academicYearId=${academicYear.id}`,
      token: teacherToken,
      params: { id: testClass.id },
    });
    expect(status).toBe(200);
  });

  it("GET /api/classes/[id]/students requires academicYearId and returns enrolled students", async () => {
    const testClass = await createTestClass(gradeId);
    const academicYear = await createTestAcademicYear();
    const student = await createTestStudent();
    await enrollTestStudent(student.id, testClass.id, academicYear.id);

    const missingParam = await callRoute(getClassStudents, {
      url: `/api/classes/${testClass.id}/students`,
      token: teacherToken,
      params: { id: testClass.id },
    });
    expect(missingParam.status).toBe(400);

    const { status, json } = await callRoute<{ data: { studentId: string }[] }>(getClassStudents, {
      url: `/api/classes/${testClass.id}/students?academicYearId=${academicYear.id}`,
      token: teacherToken,
      params: { id: testClass.id },
    });
    expect(status).toBe(200);
    expect(json.data.map((e) => e.studentId)).toContain(student.id);
  });

  describe("POST /api/classes/import", () => {
    it("imports valid rows by grade name and reports errors for unknown grades", async () => {
      const grade = await createTestGrade({ level: GradeLevel.GRADE_9, sequence: 9 });

      const { status, json } = await callRoute<{
        data: { successful: number; failed: number; errors: unknown[] };
      }>(importClasses, {
        method: "POST",
        url: "/api/classes/import",
        token: headTeacherToken,
        body: {
          rows: [
            { name: "C", gradeName: grade.name },
            { name: "D", gradeName: "Nonexistent Grade" },
          ],
        },
      });
      expect(status).toBe(200);
      expect(json.data.successful).toBe(1);
      expect(json.data.failed).toBe(1);
    });

    it("rejects import from a TEACHER", async () => {
      const { status } = await callRoute(importClasses, {
        method: "POST",
        url: "/api/classes/import",
        token: teacherToken,
        body: { rows: [{ name: "C", gradeName: "Grade 8" }] },
      });
      expect(status).toBe(403);
    });
  });
});
