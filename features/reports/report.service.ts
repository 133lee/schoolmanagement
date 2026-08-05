import { reportRepository } from "./report.repository";
import { NotFoundError, ForbiddenError } from "@/lib/http/errors";
import { GradeLevel } from "@/types/prisma-enums";

const HOD_GRADE_LEVELS: GradeLevel[] = [
  GradeLevel.GRADE_8,
  GradeLevel.GRADE_9,
  GradeLevel.GRADE_10,
  GradeLevel.GRADE_11,
  GradeLevel.GRADE_12,
];
const PASS_MARK = 50;

/**
 * Report Service
 *
 * Shared filter-option lookups (grades/classes/subjects/terms) and the
 * class performance report used by both admin and HOD reporting screens.
 * HOD-scoped variants additionally restrict to secondary grades / the HOD's
 * own department, matching what the pre-migration routes enforced inline.
 */
export class ReportService {
  /**
   * Classes for a grade, restricted to ones that actually have a subject
   * from the HOD's own department assigned — the same criterion
   * verifyHODClassAccess later checks. Without this, the class filter on
   * HOD reports would offer classes that are guaranteed to fail access
   * checks once selected (e.g. a stream in the grade with no subject
   * teacher assignment for the HOD's department at all).
   */
  async getClassesByGradeForHOD(userId: string, gradeId: string) {
    const teacherProfile = await reportRepository.findTeacherProfileWithHODSubjects(userId);

    if (!teacherProfile?.departmentAsHOD) {
      throw new NotFoundError("HOD department not found");
    }

    const departmentSubjectIds = teacherProfile.departmentAsHOD.subjects.map((s) => s.id);
    const classes = await reportRepository.findClassesByGradeForDepartment(
      gradeId,
      departmentSubjectIds
    );

    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      gradeId: c.gradeId,
      gradeName: c.grade.name,
    }));
  }

  async getClassesByGrade(gradeId: string) {
    const classes = await reportRepository.findClassesByGrade(gradeId);

    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      gradeId: c.gradeId,
      gradeName: c.grade.name,
    }));
  }

  async getAllGrades() {
    return reportRepository.findAllGrades();
  }

  async getSecondaryGrades() {
    return reportRepository.findGradesByLevels(HOD_GRADE_LEVELS);
  }

  async getAllSubjects() {
    return reportRepository.findAllSubjects();
  }

  async getHODDepartmentSubjects(userId: string) {
    const teacherProfile = await reportRepository.findTeacherProfileWithHODDepartment(userId);

    if (!teacherProfile?.departmentAsHOD) {
      throw new NotFoundError("HOD department not found");
    }

    return reportRepository.findSubjectsByDepartment(teacherProfile.departmentAsHOD.id);
  }

  async getAdminTerms() {
    const terms = await reportRepository.findAllTermsWithYear();

    return terms.map((term) => ({
      id: term.id,
      name: `${term.termType.replace("_", " ")} - ${term.academicYear.year}`,
      termType: term.termType,
      academicYear: term.academicYear.year.toString(),
      isActive: term.isActive,
    }));
  }

  async getHODTerms() {
    const terms = await reportRepository.findAllTermsWithDates();

    return terms.map((term) => ({
      id: term.id,
      name: `Term ${term.termType.replace("TERM_", "")} · ${term.academicYear.year}`,
      termType: term.termType,
      academicYear: term.academicYear.year.toString(),
      isActive: term.isActive,
      startDate: term.startDate?.toISOString() ?? null,
      endDate: term.endDate?.toISOString() ?? null,
    }));
  }

  /**
   * Throws if the HOD's department has no subject taught in this class —
   * mirrors the access check the HOD performance/subjects routes ran inline.
   */
  async verifyHODClassAccess(userId: string, classId: string): Promise<void> {
    const teacherProfile = await reportRepository.findTeacherProfileWithHODSubjects(userId);

    if (!teacherProfile?.departmentAsHOD) {
      throw new NotFoundError("HOD department not found");
    }

    const departmentSubjectIds = teacherProfile.departmentAsHOD.subjects.map((s) => s.id);

    const subjectAssignment = await reportRepository.findSubjectTeacherAssignment(
      classId,
      departmentSubjectIds
    );

    if (!subjectAssignment) {
      throw new ForbiddenError("Access denied: This class does not have subjects from your department");
    }
  }

  async getClassPerformanceReport(classId: string, termId: string) {
    const currentReportCards = await reportRepository.findReportCardsByClassAndTerm(classId, termId);

    const currentTerm = await reportRepository.findTermWithAcademicYear(termId);

    if (!currentTerm) {
      throw new NotFoundError("Term not found");
    }

    let previousTerm;
    if (currentTerm.termType === "TERM_1") {
      previousTerm = await reportRepository.findTermByTypeAndYear(
        "TERM_3",
        currentTerm.academicYear.year - 1
      );
    } else if (currentTerm.termType === "TERM_2") {
      previousTerm = await reportRepository.findTermByTypeAndAcademicYearId(
        "TERM_1",
        currentTerm.academicYearId
      );
    } else {
      previousTerm = await reportRepository.findTermByTypeAndAcademicYearId(
        "TERM_2",
        currentTerm.academicYearId
      );
    }

    let previousReportCards: { studentId: string; averageMark: number | null; position: number | null }[] = [];
    if (previousTerm) {
      previousReportCards = await reportRepository.findReportCardsForStudents(
        previousTerm.id,
        currentReportCards.map((rc) => rc.studentId)
      );
    }

    const previousPerformanceMap = new Map(previousReportCards.map((rc) => [rc.studentId, rc]));

    const passed = currentReportCards
      .filter((rc) => rc.averageMark && rc.averageMark >= PASS_MARK)
      .map((rc) => ({
        id: rc.student.id,
        studentNumber: rc.student.studentNumber,
        firstName: rc.student.firstName,
        lastName: rc.student.lastName,
        averageMark: rc.averageMark || 0,
        position: rc.position || 0,
        gender: rc.student.gender,
      }));

    const failed = currentReportCards
      .filter((rc) => !rc.averageMark || rc.averageMark < PASS_MARK)
      .map((rc) => ({
        id: rc.student.id,
        studentNumber: rc.student.studentNumber,
        firstName: rc.student.firstName,
        lastName: rc.student.lastName,
        averageMark: rc.averageMark || 0,
        position: rc.position || 0,
        gender: rc.student.gender,
      }));

    const improvementData = currentReportCards
      .map((rc) => {
        const previousData = previousPerformanceMap.get(rc.studentId);
        if (!previousData || !rc.averageMark || !previousData.averageMark) {
          return null;
        }

        return {
          id: rc.student.id,
          studentNumber: rc.student.studentNumber,
          firstName: rc.student.firstName,
          lastName: rc.student.lastName,
          currentAverage: rc.averageMark,
          previousAverage: previousData.averageMark,
          improvement: rc.averageMark - previousData.averageMark,
          position: rc.position || 0,
          previousPosition: previousData.position || 0,
        };
      })
      .filter((data): data is NonNullable<typeof data> => data !== null);

    const topImprovers = improvementData
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 3);

    const stats = {
      totalStudents: currentReportCards.length,
      passedCount: passed.length,
      failedCount: failed.length,
      passRate: currentReportCards.length > 0 ? (passed.length / currentReportCards.length) * 100 : 0,
    };

    return { passed, failed, topImprovers, stats };
  }
}

export const reportService = new ReportService();
