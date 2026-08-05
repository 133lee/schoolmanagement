import prisma from "@/lib/db/prisma";
import { NotFoundError, ForbiddenError } from "@/lib/http/errors";
import { logger } from "@/lib/logger/logger";
import { teacherClassService } from "./teacher-class.service";
import { resolveECZLevel } from "@/lib/grading/ecz-grading-system";
import { GradeLevel as PrismaGradeLevel } from "@prisma/client";
import {
  ReportCardView,
  ReportCardStudentView,
  ReportCardSubjectView,
  ReportStatistics,
  ClassReportCardsResponse,
  TeacherClassesResponse,
} from "./teacher-app.types";

/**
 * Teacher Report Service
 *
 * Business logic for teachers viewing and managing report cards.
 * Handles authorization, data retrieval, and statistics calculation.
 */
export class TeacherReportService {
  /**
   * Get all classes where teacher can view reports
   * Reuses TeacherClassService to avoid duplication
   *
   * @param userId - The user ID of the logged-in teacher
   * @returns All classes the teacher has access to
   */
  async getClassesForReports(userId: string): Promise<TeacherClassesResponse> {
    logger.info("Fetching classes for reports", { userId });

    // Reuse existing service - DRY principle!
    const classes = await teacherClassService.getClassesForTeacher(userId);

    logger.info("Classes for reports fetched successfully", {
      userId,
      classCount: classes.allClasses.length,
    });

    return classes;
  }

  /**
   * Get report cards for a specific class and term
   *
   * @param userId - The user ID of the teacher
   * @param classId - The class ID
   * @param termId - The term ID
   * @param subjectId - The subject ID (optional - for subject teachers)
   * @returns Report cards with statistics
   * @throws NotFoundError if teacher profile, class, or term not found
   * @throws ForbiddenError if teacher doesn't have access to the class
   */
  async getReportCardsForClass(
    userId: string,
    classId: string,
    termId: string,
    subjectId?: string
  ): Promise<ClassReportCardsResponse> {
    logger.info("Fetching report cards for class", { userId, classId, termId });

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!teacherProfile) {
      logger.warn("Teacher profile not found", { userId });
      throw new NotFoundError("Teacher profile not found");
    }

    // Verify teacher has access to this class
    await this.verifyTeacherClassAccess(teacherProfile.id, classId);

    // Fetch class information
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        grade: {
          select: {
            name: true,
            level: true,
          },
        },
      },
    });

    if (!classInfo) {
      logger.warn("Class not found", { classId });
      throw new NotFoundError("Class not found");
    }

    // Fetch term information
    const termInfo = await prisma.term.findUnique({
      where: { id: termId },
      select: {
        id: true,
        termType: true,
      },
    });

    if (!termInfo) {
      logger.warn("Term not found", { termId });
      throw new NotFoundError("Term not found");
    }

    // Fetch report cards for the class and term
    const reportCards = await prisma.reportCard.findMany({
      where: {
        classId,
        termId,
      },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            gender: true,
          },
        },
        subjects: {
          include: {
            subject: {
              select: {
                name: true,
                code: true,
              },
            },
          },
          orderBy: {
            subject: {
              name: "asc",
            },
          },
        },
      },
      orderBy: {
        position: "asc",
      },
    });

    logger.debug("Report cards fetched", {
      classId,
      termId,
      count: reportCards.length,
    });

    // Map to view format
    const reportCardViews = this.mapReportCardsToView(reportCards);

    // Calculate statistics (subject-specific if subjectId provided)
    const stats = this.calculateStatistics(
      reportCards,
      classInfo.grade.level,
      classInfo.grade.name,
      classInfo.name,
      subjectId
    );

    logger.info("Report cards fetched successfully", {
      userId,
      classId,
      termId,
      subjectId,
      reportCount: reportCardViews.length,
      averageClassMark: stats.averageClassMark,
      passRate: stats.passRate,
    });

    return {
      reportCards: reportCardViews,
      stats,
      classInfo: {
        id: classInfo.id,
        name: `${classInfo.grade.name} ${classInfo.name}`,
        grade: classInfo.grade.name,
      },
      termInfo: {
        id: termInfo.id,
        termType: termInfo.termType,
      },
    };
  }

  /**
   * Verify teacher has access to a specific class
   *
   * @param teacherId - The teacher profile ID
   * @param classId - The class ID to check access for
   * @throws NotFoundError if no active academic year found
   * @throws ForbiddenError if teacher doesn't have access
   */
  private async verifyTeacherClassAccess(
    teacherId: string,
    classId: string
  ): Promise<void> {
    logger.debug("Verifying teacher class access", { teacherId, classId });

    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!academicYear) {
      logger.warn("No active academic year found");
      throw new NotFoundError("No active academic year found");
    }

    // Check if teacher is class teacher for this class
    const classTeacherAssignment = await prisma.classTeacherAssignment.findFirst({
      where: {
        teacherId,
        classId,
        academicYearId: academicYear.id,
      },
    });

    if (classTeacherAssignment) {
      logger.debug("Teacher has class teacher access", { teacherId, classId });
      return;
    }

    // Check if teacher is subject teacher for this class
    const subjectTeacherAssignment = await prisma.subjectTeacherAssignment.findFirst({
      where: {
        teacherId,
        classId,
        academicYearId: academicYear.id,
      },
    });

    if (subjectTeacherAssignment) {
      logger.debug("Teacher has subject teacher access", { teacherId, classId });
      return;
    }

    logger.warn("Teacher does not have access to class", { teacherId, classId });
    throw new ForbiddenError("You do not have access to this class");
  }

  /**
   * Map report cards from database to view format
   *
   * @param reportCards - Raw report cards from database
   * @returns Formatted report card views
   */
  private mapReportCardsToView(reportCards: any[]): ReportCardView[] {
    return reportCards.map((report) => {
      const student: ReportCardStudentView = {
        id: report.student.id,
        studentNumber: report.student.studentNumber,
        firstName: report.student.firstName,
        middleName: report.student.middleName,
        lastName: report.student.lastName,
        gender: report.student.gender,
      };

      const subjects: ReportCardSubjectView[] = report.subjects.map(
        (subject: any) => ({
          subjectName: subject.subject.name,
          subjectCode: subject.subject.code,
          catMark: subject.catMark,
          midMark: subject.midMark,
          eotMark: subject.eotMark,
          totalMark: subject.totalMark,
          grade: subject.grade,
          remarks: subject.remarks,
        })
      );

      return {
        id: report.id,
        student,
        totalMarks: report.totalMarks,
        averageMark: report.averageMark,
        position: report.position,
        outOf: report.outOf,
        daysPresent: report.daysPresent,
        daysAbsent: report.daysAbsent,
        attendance: report.attendance,
        classTeacherRemarks: report.classTeacherRemarks,
        headTeacherRemarks: report.headTeacherRemarks,
        promotionStatus: report.promotionStatus,
        nextGrade: report.nextGrade,
        subjects,
      };
    });
  }

  /**
   * Calculate comprehensive statistics from report cards
   *
   * @param reportCards - Report cards to analyze
   * @param gradeLevel - Prisma GradeLevel enum (GRADE_8, GRADE_10, etc.)
   * @param gradeName - Grade display name (e.g. "Grade 8", "Form 1") — used to
   *                    distinguish Form classes (Senior, 9-point) from standard
   *                    Grade 8-9 classes (Junior, 5-point)
   * @param subjectId - Optional subject ID for subject-specific stats
   * @returns Calculated statistics
   */
  private calculateStatistics(
    reportCards: any[],
    gradeLevel: string,
    gradeName: string,
    className: string,
    subjectId?: string
  ): ReportStatistics {
    const totalStudents = reportCards.length;
    const eczLevel = resolveECZLevel(gradeLevel as PrismaGradeLevel, gradeName, className);
    const isJunior = eczLevel === "JUNIOR";

    if (totalStudents === 0) {
      logger.debug("No report cards to calculate statistics");
      return {
        totalStudents: 0,
        averageClassMark: 0,
        passRate: 0,
        distinctionRate: 0,
        attendanceRate: 0,
        isJuniorSecondary: isJunior,
      };
    }

    let totalMarksSum = 0;
    let totalMarksCount = 0;
    let passCount = 0;
    let distinctionCount = 0;
    let totalAttendanceRate = 0;

    reportCards.forEach((report) => {
      let averageMark: number | null = null;

      // If subjectId provided, calculate from that subject only
      if (subjectId) {
        const subjectData = report.subjects?.find((s: any) => s.subjectId === subjectId);
        if (subjectData && subjectData.totalMark !== null && subjectData.totalMark !== undefined) {
          averageMark = subjectData.totalMark;
        }
      } else {
        // Calculate overall average (all subjects)
        averageMark = report.averageMark;

        if (averageMark === null || averageMark === undefined) {
          // Calculate from subjects if not stored
          const subjectMarks = report.subjects
            ?.filter((s: any) => s.totalMark !== null && s.totalMark !== undefined)
            .map((s: any) => s.totalMark);

          if (subjectMarks && subjectMarks.length > 0) {
            const sum = subjectMarks.reduce((acc: number, mark: number) => acc + mark, 0);
            averageMark = sum / subjectMarks.length;
          }
        }
      }

      // Average marks
      if (averageMark !== null && averageMark !== undefined) {
        totalMarksSum += averageMark;
        totalMarksCount++;

        // Pass rate: ECZ pass threshold is >= 40% (Grade 4 / Pass 4)
        if (averageMark >= 40) {
          passCount++;
        }

        // Distinction calculation varies by grade level
        if (isJunior) {
          // Junior Secondary (Grade 8-9): Distinction 1 = 75-100%
          if (averageMark >= 75) {
            distinctionCount++;
          }
        } else {
          // Senior Secondary (Grade 10-12, Form 1-5): Grade 1-2 = 70-100%
          if (averageMark >= 70) {
            distinctionCount++;
          }
        }
      }

      // Attendance rate
      const totalDays = report.daysPresent + report.daysAbsent;
      if (totalDays > 0) {
        totalAttendanceRate += (report.daysPresent / totalDays) * 100;
      }
    });

    // Calculate distinction rate with different formulas
    let distinctionRate = 0;
    if (isJunior) {
      // Junior Secondary: Quality Rate = (Distinction 1 / Students passed) × 100
      distinctionRate = passCount > 0 ? (distinctionCount / passCount) * 100 : 0;
    } else {
      // Senior Secondary: Distinction Rate = (Grade 1-2 / Total students) × 100
      distinctionRate = totalStudents > 0 ? (distinctionCount / totalStudents) * 100 : 0;
    }

    const stats: ReportStatistics = {
      totalStudents,
      averageClassMark: totalMarksCount > 0 ? totalMarksSum / totalMarksCount : 0,
      passRate: totalStudents > 0 ? (passCount / totalStudents) * 100 : 0,
      distinctionRate,
      attendanceRate: totalStudents > 0 ? totalAttendanceRate / totalStudents : 0,
      isJuniorSecondary: isJunior,
    };

    logger.debug("Statistics calculated", { ...stats, gradeLevel, className, subjectId });

    return stats;
  }
}

// Export singleton instance
export const teacherReportService = new TeacherReportService();
