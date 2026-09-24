import prisma from "@/lib/db/prisma";
import { GradeLevel, TermType } from "@/types/prisma-enums";

/**
 * Report Repository - Data Access Layer
 *
 * Thin Prisma access for the admin/HOD reporting screens. No computation
 * or branching beyond filtering — that belongs in ReportService.
 */
export class ReportRepository {
  async findClassesByGrade(gradeId: string) {
    return prisma.class.findMany({
      where: { gradeId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        gradeId: true,
        grade: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async findClassesByGradeForDepartment(gradeId: string, subjectIds: string[]) {
    return prisma.class.findMany({
      where: {
        gradeId,
        status: "ACTIVE",
        subjectTeacherAssignments: { some: { subjectId: { in: subjectIds } } },
      },
      select: {
        id: true,
        name: true,
        gradeId: true,
        grade: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async findAllGrades() {
    return prisma.grade.findMany({
      select: { id: true, name: true, level: true, sequence: true },
      orderBy: { sequence: "asc" },
    });
  }

  async findGradeById(gradeId: string) {
    return prisma.grade.findUnique({
      where: { id: gradeId },
      select: { id: true, level: true, name: true },
    });
  }

  async findGradesByLevels(levels: GradeLevel[]) {
    return prisma.grade.findMany({
      where: { level: { in: levels } },
      select: { id: true, name: true, level: true, sequence: true },
      orderBy: { sequence: "asc" },
    });
  }

  async findAllSubjects() {
    return prisma.subject.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Subjects actually offered somewhere in a grade (via ClassSubject on one
   * of its active classes) — not every class in a grade teaches every
   * subject (e.g. one stream takes Geography, another takes Religious
   * Education), so the unscoped findAllSubjects() list is too broad for a
   * grade-level subject filter.
   */
  async findSubjectsByGrade(gradeId: string) {
    return prisma.subject.findMany({
      where: {
        deletedAt: null,
        classSubjects: {
          some: { class: { gradeId, status: "ACTIVE" } },
        },
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  async findTeacherProfileWithHODDepartment(userId: string) {
    return prisma.teacherProfile.findUnique({
      where: { userId },
      include: { departmentAsHOD: { select: { id: true } } },
    });
  }

  async findSubjectsByDepartment(departmentId: string) {
    return prisma.subject.findMany({
      where: { departmentId, deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllTermsWithYear() {
    return prisma.term.findMany({
      select: {
        id: true,
        termType: true,
        isActive: true,
        academicYear: { select: { year: true } },
      },
      orderBy: [{ academicYear: { year: "desc" } }, { termType: "asc" }],
    });
  }

  async findAllTermsWithDates() {
    return prisma.term.findMany({
      select: {
        id: true,
        termType: true,
        isActive: true,
        startDate: true,
        endDate: true,
        academicYear: { select: { year: true } },
      },
      orderBy: [{ academicYear: { year: "desc" } }, { termType: "asc" }],
    });
  }

  async findTeacherProfileWithHODSubjects(userId: string) {
    return prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        departmentAsHOD: { include: { subjects: { select: { id: true } } } },
      },
    });
  }

  async findSubjectTeacherAssignment(classId: string, subjectIds: string[]) {
    return prisma.subjectTeacherAssignment.findFirst({
      where: { classId, subjectId: { in: subjectIds } },
    });
  }

  async findReportCardsByClassAndTerm(classId: string, termId: string) {
    return prisma.reportCard.findMany({
      where: { classId, termId },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            lastName: true,
            gender: true,
          },
        },
      },
      orderBy: { position: "asc" },
    });
  }

  async findTermWithAcademicYear(termId: string) {
    return prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    });
  }

  async findTermByTypeAndYear(termType: TermType, year: number) {
    return prisma.term.findFirst({
      where: { termType, academicYear: { year } },
    });
  }

  async findTermByTypeAndAcademicYearId(termType: TermType, academicYearId: string) {
    return prisma.term.findFirst({
      where: { termType, academicYearId },
    });
  }

  async findReportCardsForStudents(termId: string, studentIds: string[]) {
    return prisma.reportCard.findMany({
      where: { termId, studentId: { in: studentIds } },
      select: { studentId: true, averageMark: true, position: true },
    });
  }
}

export const reportRepository = new ReportRepository();
