import { describe, it, expect, beforeEach } from "vitest";
import { Role, DayOfWeek, GradeLevel } from "@prisma/client";
import { GET as getClasses } from "@/app/api/teacher/classes/route";
import { GET as getClassStudents } from "@/app/api/teacher/classes/[classId]/students/route";
import { GET as getClassAttendance } from "@/app/api/teacher/classes/[classId]/attendance/route";
import { GET as getSessionRegister } from "@/app/api/teacher/classes/[classId]/session-register/route";
import { GET as exportClassList } from "@/app/api/teacher/classes/export-class-list/route";
import Papa from "papaparse";
import prisma from "@/lib/db/prisma";
import { callRoute } from "../../helpers/callRoute";
import { loginAs } from "../../helpers/auth";
import {
  resetDb,
  createTestUser,
  createTestAcademicYear,
  createTestTerm,
  createTestGrade,
  createTestClass,
  createTestSubject,
  createTestStudent,
  enrollTestStudent,
  assignClassTeacher,
  assignSubjectTeacher,
} from "../../helpers/db";

describe("teacher/classes", () => {
  let classTeacher: Awaited<ReturnType<typeof createTestUser>>;
  let classTeacherToken: string;
  let outsiderToken: string;

  beforeEach(async () => {
    await resetDb();
    classTeacher = await createTestUser({ role: Role.TEACHER });
    classTeacherToken = await loginAs(classTeacher.user.email, classTeacher.password);
    const outsider = await createTestUser({ role: Role.TEACHER });
    outsiderToken = await loginAs(outsider.user.email, outsider.password);
  });

  describe("GET /api/teacher/classes", () => {
    it("returns classes the teacher is assigned to (class teacher + subject teacher, deduplicated)", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(classTeacher.teacherProfile!.id, testClass.id, academicYear.id);

      const { status, json } = await callRoute<{
        data: { allClasses: { id: string }[]; classTeacherClasses: { id: string }[] };
      }>(getClasses, { url: "/api/teacher/classes", token: classTeacherToken });

      expect(status).toBe(200);
      expect(json.data.allClasses.map((c) => c.id)).toContain(testClass.id);
      expect(json.data.classTeacherClasses.map((c) => c.id)).toContain(testClass.id);
    });

    it("carries the subject code alongside the subject name, for subject-teacher and secondary class-teacher classes, and none for a primary class teacher", async () => {
      const academicYear = await createTestAcademicYear();
      const teacherId = classTeacher.teacherProfile!.id;
      const mathsAsClassTeacher = await createTestSubject({ name: "Mathematics" });
      const scienceAsSubjectTeacher = await createTestSubject({ name: "Integrated Science" });

      // Secondary class this teacher runs AND teaches maths in.
      const secondaryGrade = await createTestGrade({ level: GradeLevel.GRADE_8, sequence: 8 });
      const ownClass = await createTestClass(secondaryGrade.id, { name: "A" });
      await assignClassTeacher(teacherId, ownClass.id, academicYear.id);
      await assignSubjectTeacher(teacherId, mathsAsClassTeacher.id, ownClass.id, academicYear.id);

      // Secondary class where they're only the science subject teacher.
      const otherClass = await createTestClass(secondaryGrade.id, { name: "B" });
      await assignSubjectTeacher(teacherId, scienceAsSubjectTeacher.id, otherClass.id, academicYear.id);

      // Primary class teacher — teaches every subject, so no single code.
      const primaryGrade = await createTestGrade({ level: GradeLevel.GRADE_2, sequence: 2 });
      const primaryClass = await createTestClass(primaryGrade.id, { name: "A" });
      await assignClassTeacher(teacherId, primaryClass.id, academicYear.id);

      type ClassView = {
        id: string;
        teachingSubject: string;
        teachingSubjectCode?: string;
        teachingSubjects?: { id: string; name: string; code: string }[];
      };
      const { status, json } = await callRoute<{
        data: { classTeacherClasses: ClassView[]; subjectTeacherClasses: ClassView[] };
      }>(getClasses, { url: "/api/teacher/classes", token: classTeacherToken });
      expect(status).toBe(200);

      const own = json.data.classTeacherClasses.find((c) => c.id === ownClass.id)!;
      expect(own.teachingSubject).toBe("Mathematics");
      expect(own.teachingSubjectCode).toBe(mathsAsClassTeacher.code);
      expect(own.teachingSubjects).toEqual([
        { id: mathsAsClassTeacher.id, name: "Mathematics", code: mathsAsClassTeacher.code },
      ]);

      const other = json.data.subjectTeacherClasses.find((c) => c.id === otherClass.id)!;
      expect(other.teachingSubject).toBe("Integrated Science");
      expect(other.teachingSubjectCode).toBe(scienceAsSubjectTeacher.code);

      const primary = json.data.classTeacherClasses.find((c) => c.id === primaryClass.id)!;
      expect(primary.teachingSubject).toBe("All Subjects");
      expect(primary.teachingSubjectCode).toBeUndefined();
    });
  });

  describe("GET /api/teacher/classes/[classId]/students", () => {
    it("returns enrolled students for a class the teacher is assigned to, 403s for an outsider", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(classTeacher.teacherProfile!.id, testClass.id, academicYear.id);
      const student = await createTestStudent();
      await enrollTestStudent(student.id, testClass.id, academicYear.id);

      const denied = await callRoute(getClassStudents, {
        url: `/api/teacher/classes/${testClass.id}/students`,
        token: outsiderToken,
        params: { classId: testClass.id },
      });
      expect(denied.status).toBe(403);

      const { status, json } = await callRoute<{ data: { students: { id: string }[]; total: number } }>(
        getClassStudents,
        { url: `/api/teacher/classes/${testClass.id}/students`, token: classTeacherToken, params: { classId: testClass.id } }
      );
      expect(status).toBe(200);
      expect(json.data.total).toBe(1);
      expect(json.data.students.map((s) => s.id)).toContain(student.id);
    });
  });

  describe("GET /api/teacher/classes/[classId]/attendance", () => {
    it("validates month/period params and rejects an outsider", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(classTeacher.teacherProfile!.id, testClass.id, academicYear.id);

      const badMonth = await callRoute(getClassAttendance, {
        url: `/api/teacher/classes/${testClass.id}/attendance?month=13`,
        token: classTeacherToken,
        params: { classId: testClass.id },
      });
      expect(badMonth.status).toBe(400);

      const denied = await callRoute(getClassAttendance, {
        url: `/api/teacher/classes/${testClass.id}/attendance`,
        token: outsiderToken,
        params: { classId: testClass.id },
      });
      expect(denied.status).toBe(403);

      const { status } = await callRoute(getClassAttendance, {
        url: `/api/teacher/classes/${testClass.id}/attendance`,
        token: classTeacherToken,
        params: { classId: testClass.id },
      });
      expect(status).toBe(200);
    });
  });

  describe("GET /api/teacher/classes/[classId]/session-register", () => {
    it("requires subjectId+termId, and requires the teacher to actually teach that class+subject via a timetable slot", async () => {
      const academicYear = await createTestAcademicYear();
      const term = await createTestTerm(academicYear.id);
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      const subject = await createTestSubject();

      const missingParams = await callRoute(getSessionRegister, {
        url: `/api/teacher/classes/${testClass.id}/session-register`,
        token: classTeacherToken,
        params: { classId: testClass.id },
      });
      expect(missingParams.status).toBe(400);

      const noSlot = await callRoute(getSessionRegister, {
        url: `/api/teacher/classes/${testClass.id}/session-register?subjectId=${subject.id}&termId=${term.id}`,
        token: classTeacherToken,
        params: { classId: testClass.id },
      });
      expect(noSlot.status).toBe(400);

      await prisma.timetableSlot.create({
        data: {
          classId: testClass.id,
          subjectId: subject.id,
          teacherId: classTeacher.teacherProfile!.id,
          academicYearId: academicYear.id,
          dayOfWeek: DayOfWeek.MONDAY,
          periodNumber: 1,
          startTime: "07:00",
          endTime: "07:40",
        },
      });

      const { status, json } = await callRoute<{ data: { termLabel: string; students: unknown[] } }>(
        getSessionRegister,
        {
          url: `/api/teacher/classes/${testClass.id}/session-register?subjectId=${subject.id}&termId=${term.id}`,
          token: classTeacherToken,
          params: { classId: testClass.id },
        }
      );
      expect(status).toBe(200);
      expect(json.data.termLabel).toContain(String(academicYear.year));
    });
  });

  describe("GET /api/teacher/classes/export-class-list", () => {
    it("requires classId+mode, and exports a PDF for a class teacher's own class", async () => {
      const academicYear = await createTestAcademicYear();
      const grade = await createTestGrade();
      const testClass = await createTestClass(grade.id);
      await assignClassTeacher(classTeacher.teacherProfile!.id, testClass.id, academicYear.id);
      const student = await createTestStudent();
      await enrollTestStudent(student.id, testClass.id, academicYear.id);

      const missingParams = await callRoute(exportClassList, {
        url: "/api/teacher/classes/export-class-list",
        token: classTeacherToken,
      });
      expect(missingParams.status).toBe(400);

      const denied = await callRoute(exportClassList, {
        url: `/api/teacher/classes/export-class-list?classId=${testClass.id}&mode=class`,
        token: outsiderToken,
      });
      expect(denied.status).toBe(403);

      const { status, contentType, byteLength } = await callRoute(exportClassList, {
        url: `/api/teacher/classes/export-class-list?classId=${testClass.id}&mode=class`,
        token: classTeacherToken,
      });
      expect(status).toBe(200);
      expect(contentType).toBe("application/pdf");
      expect(byteLength).toBeGreaterThan(0);
    });

    describe("format=csv", () => {
      async function seedClass() {
        const academicYear = await createTestAcademicYear();
        const grade = await createTestGrade();
        const testClass = await createTestClass(grade.id);
        await assignClassTeacher(classTeacher.teacherProfile!.id, testClass.id, academicYear.id);
        // Inserted out of order, and one surname contains a comma, so the
        // sort and the CSV quoting are both genuinely exercised.
        for (const [firstName, lastName] of [
          ["Jonas", "Zulu"],
          ["Lyson", "Banda"],
          ["Anna", "Banda"],
          ["Mary", "Mwansa, Jr"],
        ]) {
          const student = await createTestStudent({ firstName, lastName });
          await enrollTestStudent(student.id, testClass.id, academicYear.id);
        }
        return testClass;
      }

      it("returns a CSV attachment with one row per student, sorted by last name then first name, names in separate columns", async () => {
        const testClass = await seedClass();

        const { status, contentType, text, headers } = await callRoute(exportClassList, {
          url: `/api/teacher/classes/export-class-list?classId=${testClass.id}&mode=class&format=csv`,
          token: classTeacherToken,
        });

        expect(status).toBe(200);
        expect(contentType).toContain("text/csv");
        expect(headers.get("content-disposition")).toMatch(/^attachment; filename="ClassList_.+\.csv"$/);

        const lines = text!.trim().split(/\r?\n/);
        expect(lines[0]).toBe(
          "#,Student Number,Last Name,First Name,Middle Name,Gender,Date of Birth,Admission Date,Status"
        );
        expect(lines).toHaveLength(5); // header + 4 students

        // Parse it back the way a spreadsheet would: a comma inside a value
        // must have been quoted, or it would split into an extra column and
        // shift every field after it.
        const parsed = Papa.parse<Record<string, string>>(text!, { header: true, skipEmptyLines: true });
        expect(parsed.errors).toEqual([]);
        expect(parsed.data.map((r) => `${r["Last Name"]}|${r["First Name"]}`)).toEqual([
          "Banda|Anna",
          "Banda|Lyson",
          "Mwansa, Jr|Mary",
          "Zulu|Jonas",
        ]);
        expect(parsed.data.every((r) => r["Status"] === "ACTIVE")).toBe(true);
        expect(lines[3]).toContain('"Mwansa, Jr"');
      });

      it("applies the same authorization as the PDF — an outsider is refused", async () => {
        const testClass = await seedClass();

        const denied = await callRoute(exportClassList, {
          url: `/api/teacher/classes/export-class-list?classId=${testClass.id}&mode=class&format=csv`,
          token: outsiderToken,
        });
        expect(denied.status).toBe(403);
        expect(denied.text).toBeNull();
      });

      it("rejects an unknown format, and an explicit format=pdf still returns the PDF", async () => {
        const testClass = await seedClass();

        const bad = await callRoute(exportClassList, {
          url: `/api/teacher/classes/export-class-list?classId=${testClass.id}&mode=class&format=xml`,
          token: classTeacherToken,
        });
        expect(bad.status).toBe(400);

        const pdf = await callRoute(exportClassList, {
          url: `/api/teacher/classes/export-class-list?classId=${testClass.id}&mode=class&format=pdf`,
          token: classTeacherToken,
        });
        expect(pdf.status).toBe(200);
        expect(pdf.contentType).toBe("application/pdf");
      });
    });
  });
});
