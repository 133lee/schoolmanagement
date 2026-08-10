import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as getCurriculum, POST as assignSubject, PUT as bulkAssignGrade } from "@/app/api/admin/curriculum/route";
import { PUT as bulkAssignClass } from "@/app/api/admin/curriculum/classes/route";
import { GET as getClassSubjects } from "@/app/api/admin/curriculum/classes/[classId]/route";
import { GET as getGrades } from "@/app/api/admin/curriculum/grades/route";
import { GET as getGradeSubjects } from "@/app/api/admin/curriculum/grades/[gradeId]/route";
import { GET as getAllSubjects } from "@/app/api/admin/curriculum/subjects/route";
import {
  PATCH as updateCoreStatus,
  DELETE as removeSubjectFromGrade,
} from "@/app/api/admin/curriculum/grades/[gradeId]/subjects/[subjectId]/route";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestAcademicYear,
  createTestClassSubject,
  assignTeacherSubject,
} from "../../helpers/db";
import prisma from "@/lib/db/prisma";

describe("admin/curriculum", () => {
  let adminToken: string;
  let headTeacherToken: string;
  let teacherToken: string;

  beforeEach(async () => {
    await resetDb();
    const admin = await createTestUser({ role: Role.ADMIN });
    adminToken = await loginAs(admin.user.email, admin.password);
    const headTeacher = await createTestUser({ role: Role.HEAD_TEACHER });
    headTeacherToken = await loginAs(headTeacher.user.email, headTeacher.password);
    const teacher = await createTestUser({ role: Role.TEACHER });
    teacherToken = await loginAs(teacher.user.email, teacher.password);
  });

  it("supports the full assign/view/update-core/remove lifecycle for grade-subject curriculum", async () => {
    const grade = await createTestGrade();
    const subject = await createTestSubject({ name: "Mathematics" });

    const assigned = await callRoute<{ data: { gradeId: string; subjectId: string; isCore: boolean } }>(
      assignSubject,
      { method: "POST", url: "/api/admin/curriculum", token: adminToken, body: { gradeId: grade.id, subjectId: subject.id, isCore: true } }
    );
    expect(assigned.status).toBe(201);
    expect(assigned.json.data.isCore).toBe(true);

    const byGrade = await callRoute<{ data: { subjectId: string }[] }>(getGradeSubjects, {
      url: `/api/admin/curriculum/grades/${grade.id}`,
      token: adminToken,
      params: { gradeId: grade.id },
    });
    expect(byGrade.status).toBe(200);
    expect(byGrade.json.data.map((s) => s.subjectId)).toContain(subject.id);

    const patched = await callRoute<{ data: { isCore: boolean } }>(updateCoreStatus, {
      method: "PATCH",
      url: `/api/admin/curriculum/grades/${grade.id}/subjects/${subject.id}`,
      token: adminToken,
      params: { gradeId: grade.id, subjectId: subject.id },
      body: { isCore: false },
    });
    expect(patched.status).toBe(200);
    expect(patched.json.data.isCore).toBe(false);

    const removed = await callRoute(removeSubjectFromGrade, {
      method: "DELETE",
      url: `/api/admin/curriculum/grades/${grade.id}/subjects/${subject.id}`,
      token: adminToken,
      params: { gradeId: grade.id, subjectId: subject.id },
    });
    expect(removed.status).toBe(200);

    const afterRemove = await callRoute<{ data: { subjectId: string }[] }>(getGradeSubjects, {
      url: `/api/admin/curriculum/grades/${grade.id}`,
      token: adminToken,
      params: { gradeId: grade.id },
    });
    expect(afterRemove.json.data.map((s) => s.subjectId)).not.toContain(subject.id);
  });

  it("bulk-assigns subjects to a grade and to a class/stream", async () => {
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    const subjectA = await createTestSubject({ name: "English" });
    const subjectB = await createTestSubject({ name: "Science" });

    const bulkGrade = await callRoute(bulkAssignGrade, {
      method: "PUT",
      url: "/api/admin/curriculum",
      token: adminToken,
      body: { gradeId: grade.id, subjects: [{ subjectId: subjectA.id, isCore: true }, { subjectId: subjectB.id, isCore: false }] },
    });
    expect(bulkGrade.status).toBe(200);

    const bulkClass = await callRoute(bulkAssignClass, {
      method: "PUT",
      url: "/api/admin/curriculum/classes",
      token: adminToken,
      body: {
        classId: testClass.id,
        subjects: [{ subjectId: subjectA.id, isCore: true, periodsPerWeek: 5 }],
      },
    });
    expect(bulkClass.status).toBe(200);

    const classSubjects = await callRoute<{ data: { subjectId: string }[] }>(getClassSubjects, {
      url: `/api/admin/curriculum/classes/${testClass.id}`,
      token: adminToken,
      params: { classId: testClass.id },
    });
    expect(classSubjects.status).toBe(200);
    expect(classSubjects.json.data.map((s) => s.subjectId)).toContain(subjectA.id);
  });

  it("bulk-assigning a class curriculum keeps assignments for retained subjects and clears them for dropped ones", async () => {
    const grade = await createTestGrade();
    const testClass = await createTestClass(grade.id);
    const subjectKept = await createTestSubject({ name: "Kept Subject" });
    const subjectDropped = await createTestSubject({ name: "Dropped Subject" });
    const subjectNew = await createTestSubject({ name: "New Subject" });

    const classSubjectKept = await createTestClassSubject(testClass.id, subjectKept.id);
    const classSubjectDropped = await createTestClassSubject(testClass.id, subjectDropped.id);

    const academicYear = await createTestAcademicYear();
    const teacher = await createTestUser({ role: Role.TEACHER });
    await assignTeacherSubject(teacher.teacherProfile!.id, subjectKept.id);
    await assignTeacherSubject(teacher.teacherProfile!.id, subjectDropped.id);

    const assignmentKept = await prisma.subjectTeacherAssignment.create({
      data: {
        teacherId: teacher.teacherProfile!.id,
        subjectId: subjectKept.id,
        classId: testClass.id,
        academicYearId: academicYear.id,
        classSubjectId: classSubjectKept.id,
      },
    });
    const assignmentDropped = await prisma.subjectTeacherAssignment.create({
      data: {
        teacherId: teacher.teacherProfile!.id,
        subjectId: subjectDropped.id,
        classId: testClass.id,
        academicYearId: academicYear.id,
        classSubjectId: classSubjectDropped.id,
      },
    });

    // New curriculum: drop subjectDropped, keep subjectKept, add subjectNew
    const { status } = await callRoute(bulkAssignClass, {
      method: "PUT",
      url: "/api/admin/curriculum/classes",
      token: adminToken,
      body: {
        classId: testClass.id,
        subjects: [
          { subjectId: subjectKept.id, isCore: true, periodsPerWeek: 6 },
          { subjectId: subjectNew.id, isCore: false, periodsPerWeek: 3 },
        ],
      },
    });
    expect(status).toBe(200);

    // Kept subject: same ClassSubject id, updated periodsPerWeek, assignment untouched
    const keptClassSubject = await prisma.classSubject.findUnique({ where: { id: classSubjectKept.id } });
    expect(keptClassSubject?.periodsPerWeek).toBe(6);
    const keptAssignment = await prisma.subjectTeacherAssignment.findUnique({
      where: { id: assignmentKept.id },
    });
    expect(keptAssignment?.classSubjectId).toBe(classSubjectKept.id);

    // Dropped subject: ClassSubject and its assignment are both gone
    const droppedClassSubject = await prisma.classSubject.findUnique({ where: { id: classSubjectDropped.id } });
    expect(droppedClassSubject).toBeNull();
    const droppedAssignment = await prisma.subjectTeacherAssignment.findUnique({
      where: { id: assignmentDropped.id },
    });
    expect(droppedAssignment).toBeNull();

    // New subject: a fresh ClassSubject row now exists
    const newClassSubject = await prisma.classSubject.findFirst({
      where: { classId: testClass.id, subjectId: subjectNew.id },
    });
    expect(newClassSubject).not.toBeNull();
  });

  it("GET /api/admin/curriculum, /grades, /subjects allow HEAD_TEACHER but reject TEACHER", async () => {
    for (const [handler, url] of [
      [getCurriculum, "/api/admin/curriculum"],
      [getGrades, "/api/admin/curriculum/grades"],
      [getAllSubjects, "/api/admin/curriculum/subjects"],
    ] as const) {
      const asHeadTeacher = await callRoute(handler, { url, token: headTeacherToken });
      expect(asHeadTeacher.status).toBe(200);

      const asTeacher = await callRoute(handler, { url, token: teacherToken });
      expect(asTeacher.status).toBe(403);
    }
  });

  it("rejects curriculum writes from HEAD_TEACHER — ADMIN only", async () => {
    const grade = await createTestGrade();
    const subject = await createTestSubject();

    const { status } = await callRoute(assignSubject, {
      method: "POST",
      url: "/api/admin/curriculum",
      token: headTeacherToken,
      body: { gradeId: grade.id, subjectId: subject.id, isCore: true },
    });

    expect(status).toBe(403);
  });
});
