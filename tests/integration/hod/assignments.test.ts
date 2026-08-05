import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as listAssignments, POST as createAssignment } from "@/app/api/hod/assignments/route";
import {
  GET as getAssignment,
  PATCH as patchAssignment,
  DELETE as deleteAssignment,
} from "@/app/api/hod/assignments/[id]/route";
import { POST as bulkAssign } from "@/app/api/hod/assignments/bulk/route";
import { GET as byClass } from "@/app/api/hod/assignments/by-class/[classId]/route";
import { GET as bySubject } from "@/app/api/hod/assignments/by-subject/[subjectId]/route";
import { GET as byTeacher } from "@/app/api/hod/assignments/by-teacher/[teacherId]/route";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import {
  resetDb,
  createHODUser,
  createTestUser,
  createTestAcademicYear,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestClassSubject,
  assignTeacherToDepartment,
  assignTeacherSubject,
} from "../../helpers/db";

describe("hod/assignments", () => {
  let hod: Awaited<ReturnType<typeof createHODUser>>;
  let hodToken: string;
  let plainTeacherToken: string;

  beforeEach(async () => {
    await resetDb();
    hod = await createHODUser();
    hodToken = await loginAs(hod.user.email, hod.password);
    const plainTeacher = await createTestUser({ role: Role.TEACHER });
    plainTeacherToken = await loginAs(plainTeacher.user.email, plainTeacher.password);
  });

  it("rejects a non-HOD teacher entirely (withHODAccess)", async () => {
    const { status } = await callRoute(listAssignments, { url: "/api/hod/assignments", token: plainTeacherToken });
    expect(status).toBe(403);
  });

  it("supports the full create/list/get/update/delete lifecycle within the HOD's department", async () => {
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade(); // defaults to GRADE_8 (secondary)
    const testClass = await createTestClass(grade.id);
    const subject = await createTestSubject({ departmentId: hod.department.id });
    await createTestClassSubject(testClass.id, subject.id);

    const teacher = await createTestUser({ role: Role.TEACHER });
    await assignTeacherToDepartment(teacher.teacherProfile!.id, hod.department.id);
    await assignTeacherSubject(teacher.teacherProfile!.id, subject.id);

    const created = await callRoute<{ data: { id: string } }>(createAssignment, {
      method: "POST",
      url: "/api/hod/assignments",
      token: hodToken,
      body: {
        teacherId: teacher.teacherProfile!.id,
        subjectId: subject.id,
        classId: testClass.id,
        academicYearId: academicYear.id,
      },
    });
    expect(created.status).toBe(201);
    const assignmentId = created.json.data.id;

    const list = await callRoute<{ data: { data: { id: string }[] } }>(listAssignments, {
      url: "/api/hod/assignments",
      token: hodToken,
    });
    expect(list.status).toBe(200);
    expect(list.json.data.data.map((a) => a.id)).toContain(assignmentId);

    const got = await callRoute<{ data: { id: string } }>(getAssignment, {
      url: `/api/hod/assignments/${assignmentId}`,
      token: hodToken,
      params: { id: assignmentId },
    });
    expect(got.status).toBe(200);

    const secondTeacher = await createTestUser({ role: Role.TEACHER });
    await assignTeacherToDepartment(secondTeacher.teacherProfile!.id, hod.department.id);
    await assignTeacherSubject(secondTeacher.teacherProfile!.id, subject.id);

    const patched = await callRoute<{ data: { teacherId: string } }>(patchAssignment, {
      method: "PATCH",
      url: `/api/hod/assignments/${assignmentId}`,
      token: hodToken,
      params: { id: assignmentId },
      body: { teacherId: secondTeacher.teacherProfile!.id },
    });
    expect(patched.status).toBe(200);
    expect(patched.json.data.teacherId).toBe(secondTeacher.teacherProfile!.id);

    const deleted = await callRoute(deleteAssignment, {
      method: "DELETE",
      url: `/api/hod/assignments/${assignmentId}`,
      token: hodToken,
      params: { id: assignmentId },
    });
    expect(deleted.status).toBe(204);
  });

  it("rejects creating an assignment for a subject outside the HOD's department", async () => {
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    const outsideSubject = await createTestSubject(); // no departmentId -> not in hod.department
    const teacher = await createTestUser({ role: Role.TEACHER });

    const { status } = await callRoute(createAssignment, {
      method: "POST",
      url: "/api/hod/assignments",
      token: hodToken,
      body: {
        teacherId: teacher.teacherProfile!.id,
        subjectId: outsideSubject.id,
        classId: testClass.id,
        academicYearId: academicYear.id,
      },
    });
    // UnauthorizedError here comes from the legacy @/lib/errors hierarchy,
    // which maps to 403 (not 401 — that's reserved for "no/invalid token").
    expect(status).toBe(403);
  });

  it("bulk-assigns multiple subject-teacher pairs to a class", async () => {
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    const subject = await createTestSubject({ departmentId: hod.department.id });
    await createTestClassSubject(testClass.id, subject.id);
    const teacher = await createTestUser({ role: Role.TEACHER });
    await assignTeacherToDepartment(teacher.teacherProfile!.id, hod.department.id);
    await assignTeacherSubject(teacher.teacherProfile!.id, subject.id);

    const { status } = await callRoute(bulkAssign, {
      method: "POST",
      url: "/api/hod/assignments/bulk",
      token: hodToken,
      body: {
        classId: testClass.id,
        academicYearId: academicYear.id,
        assignments: [{ teacherId: teacher.teacherProfile!.id, subjectId: subject.id }],
      },
    });
    expect(status).toBe(200);
  });

  it("by-class/by-subject/by-teacher all scope results to the HOD's department", async () => {
    const academicYear = await createTestAcademicYear();
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    const subject = await createTestSubject({ departmentId: hod.department.id });
    await createTestClassSubject(testClass.id, subject.id);
    const teacher = await createTestUser({ role: Role.TEACHER });
    await assignTeacherToDepartment(teacher.teacherProfile!.id, hod.department.id);
    await assignTeacherSubject(teacher.teacherProfile!.id, subject.id);

    await callRoute(createAssignment, {
      method: "POST",
      url: "/api/hod/assignments",
      token: hodToken,
      body: {
        teacherId: teacher.teacherProfile!.id,
        subjectId: subject.id,
        classId: testClass.id,
        academicYearId: academicYear.id,
      },
    });

    const byClassResult = await callRoute<{ data: { id: string }[] }>(byClass, {
      url: `/api/hod/assignments/by-class/${testClass.id}`,
      token: hodToken,
      params: { classId: testClass.id },
    });
    expect(byClassResult.status).toBe(200);
    expect(byClassResult.json.data).toHaveLength(1);

    const bySubjectResult = await callRoute<{ data: { id: string }[] }>(bySubject, {
      url: `/api/hod/assignments/by-subject/${subject.id}`,
      token: hodToken,
      params: { subjectId: subject.id },
    });
    expect(bySubjectResult.status).toBe(200);
    expect(bySubjectResult.json.data).toHaveLength(1);

    const byTeacherResult = await callRoute<{ data: { id: string }[] }>(byTeacher, {
      url: `/api/hod/assignments/by-teacher/${teacher.teacherProfile!.id}`,
      token: hodToken,
      params: { teacherId: teacher.teacherProfile!.id },
    });
    expect(byTeacherResult.status).toBe(200);
    expect(byTeacherResult.json.data).toHaveLength(1);
  });
});
