import prisma from "@/lib/db/prisma";
import { reportCardRepository } from "./reportCard.repository";
import { reportCardSubjectRepository } from "./reportCardSubject.repository";
import { studentRepository } from "@/features/students/student.repository";
import { classRepository } from "@/features/classes/class.repository";
import { termRepository } from "@/features/terms/term.repository";
import { academicYearRepository } from "@/features/academic-years/academicYear.repository";
import { teacherRepository } from "@/features/teachers/teacher.repository";
import { assessmentRepository } from "@/features/assessments/assessment.repository";
import { attendanceRecordRepository } from "@/features/attendance/attendanceRecord.repository";
import {
  ReportCard,
  PromotionStatus,
  GradeLevel,
  ExamType,
  ECZGrade,
  AttendanceStatus,
  Role,
} from "@/types/prisma-enums";
import { ValidationError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { requireMinimumRole, AuthContext } from "@/lib/auth/authorization";
import { calculateECZGrade, resolveECZLevel } from "@/lib/grading/ecz-grading-system";

export type ServiceContext = AuthContext;

// Input DTOs
export interface GenerateReportCardInput {
  studentId: string;
  classId: string;
  termId: string;
  classTeacherId: string;
}

export interface UpdateReportCardInput {
  classTeacherRemarks?: string;
  headTeacherRemarks?: string;
  promotionStatus?: PromotionStatus;
  nextGrade?: GradeLevel;
}

export interface ReportCardFilters {
  studentId?: string;
  classId?: string;
  termId?: string;
  academicYearId?: string;
  promotionStatus?: PromotionStatus;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * ReportCard Service - Business Logic Layer
 *
 * Handles:
 * - Report card generation from assessments and attendance
 * - Grade calculation and positioning
 * - Promotion status determination
 * - Permission checks
 */
export class ReportCardService {
  // ==================== REPORT CARD GENERATION ====================

  /**
   * Generate report card for a student
   * Aggregates assessment results and attendance for the term
   */
  async generateReportCard(
    data: GenerateReportCardInput,
    context: ServiceContext
  ) {
    // Only TEACHER+ can generate report cards (includes HOD, DEPUTY_HEAD, HEAD_TEACHER, ADMIN)
    requireMinimumRole(context, Role.TEACHER, "Only teachers and above can generate report cards");

    // Validate student exists
    const student = await studentRepository.findById(data.studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    // Validate class exists and get grade info for grading scale
    const classEntity = await prisma.class.findUnique({
      where: { id: data.classId },
      include: {
        grade: true,
      },
    });
    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    // Validate term exists and get academic year
    const term = await termRepository.findByIdWithRelations(data.termId);
    if (!term) {
      throw new NotFoundError("Term not found");
    }

    // Validate class teacher exists
    const classTeacher = await teacherRepository.findById(
      data.classTeacherId
    );
    if (!classTeacher) {
      throw new NotFoundError("Class teacher not found");
    }

    // Check if report card already exists
    const existing = await reportCardRepository.findByStudentAndTerm(
      data.studentId,
      data.termId
    );
    if (existing) {
      throw new ValidationError(
        "Report card already exists for this student and term"
      );
    }

    // Get all subjects from the CLASS CURRICULUM (ClassSubject)
    // This is the authoritative source for what subjects a class offers
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId: data.classId,
      },
      include: {
        subject: true,
      },
      orderBy: {
        subject: {
          name: "asc",
        },
      },
    });

    if (classSubjects.length === 0) {
      throw new ValidationError(
        "No subjects configured in the curriculum for this class. Please add subjects via Admin > Settings > Curriculum first."
      );
    }

    // Get all assessments for this student in this term
    const assessments = await assessmentRepository.findMany({
      where: {
        classId: data.classId,
        termId: data.termId,
        status: "COMPLETED",
      },
      include: {
        results: {
          where: {
            studentId: data.studentId,
          },
        },
        subject: true,
      },
    });

    // Calculate subject marks
    const subjectMarks = new Map<string, {
      catMark: number | null;
      midMark: number | null;
      eotMark: number | null;
      totalMark: number;
      grade: ECZGrade;
    }>();

    for (const classSubject of classSubjects) {
      const subjectId = classSubject.subjectId;
      const subjectAssessments = assessments.filter(
        (a) => a.subjectId === subjectId
      );

      let catMark: number | null = null;
      let midMark: number | null = null;
      let eotMark: number | null = null;

      for (const assessment of subjectAssessments) {
        const result = assessment.results[0];
        if (!result) continue;

        // Convert to percentage
        const percentage = (result.marksObtained / assessment.totalMarks) * 100;

        switch (assessment.examType) {
          case ExamType.CAT:
            catMark = percentage;
            break;
          case ExamType.MID:
            midMark = percentage;
            break;
          case ExamType.EOT:
            eotMark = percentage;
            break;
        }
      }

      // Calculate total mark (weighted average)
      // CAT: 20%, MID: 30%, EOT: 50%
      let totalMark = 0;
      let weightSum = 0;

      if (catMark !== null) {
        totalMark += catMark * 0.2;
        weightSum += 0.2;
      }
      if (midMark !== null) {
        totalMark += midMark * 0.3;
        weightSum += 0.3;
      }
      if (eotMark !== null) {
        totalMark += eotMark * 0.5;
        weightSum += 0.5;
      }

      // Normalize if not all exams completed
      if (weightSum > 0) {
        totalMark = totalMark / weightSum;
      }

      // Calculate grade using correct grading scale — grade name takes precedence
      // so Form classes always use the 9-point Senior scale even if their enum is GRADE_8/9
      const gradeLevel = resolveECZLevel(classEntity.grade.level, classEntity.grade.name, classEntity.name);
      const grade = calculateECZGrade(totalMark, gradeLevel);

      subjectMarks.set(subjectId, {
        catMark,
        midMark,
        eotMark,
        totalMark,
        grade,
      });
    }

    // Calculate overall total and average
    let totalMarks = 0;
    let subjectCount = 0;

    for (const [_, marks] of subjectMarks) {
      totalMarks += marks.totalMark;
      subjectCount++;
    }

    const averageMark = subjectCount > 0 ? totalMarks / subjectCount : 0;

    // Get attendance statistics
    const attendanceRecords = await attendanceRecordRepository.findMany({
      where: {
        studentId: data.studentId,
        termId: data.termId,
      },
    });

    const daysPresent = attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE
    ).length;

    const daysAbsent = attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.ABSENT
    ).length;

    const attendance = attendanceRecords.length;

    // Create report card with subjects in transaction
    return reportCardRepository.withTransaction(async (tx) => {
      // Create main report card
      const reportCard = await tx.reportCard.create({
        data: {
          student: { connect: { id: data.studentId } },
          class: { connect: { id: data.classId } },
          term: { connect: { id: data.termId } },
          academicYear: { connect: { id: term.academicYearId } },
          classTeacher: { connect: { id: data.classTeacherId } },
          totalMarks,
          averageMark,
          attendance,
          daysPresent,
          daysAbsent,
          position: null, // Will be calculated separately
          outOf: null,
        },
      });

      // Create subject entries
      for (const [subjectId, marks] of subjectMarks) {
        await tx.reportCardSubject.create({
          data: {
            reportCard: { connect: { id: reportCard.id } },
            subject: { connect: { id: subjectId } },
            catMark: marks.catMark,
            midMark: marks.midMark,
            eotMark: marks.eotMark,
            totalMark: marks.totalMark,
            grade: marks.grade,
          },
        });
      }

      return reportCard;
    });
  }

  /**
   * Calculate class positions for all report cards in a term
   */
  async calculateClassPositions(
    classId: string,
    termId: string,
    context: ServiceContext
  ) {
    // Only TEACHER+ can calculate positions (includes HOD, DEPUTY_HEAD, HEAD_TEACHER, ADMIN)
    requireMinimumRole(context, Role.TEACHER, "Only teachers and above can calculate positions");

    const reportCards = await reportCardRepository.findMany({
      where: {
        classId,
        termId,
      },
      orderBy: {
        averageMark: "desc",
      },
    });

    const total = reportCards.length;

    // Batched in one transaction: a sequential loop of awaited updates left
    // positions half-written if it failed partway through (report cards
    // showing e.g. "3rd of 30" alongside others still on stale positions).
    // See assessment.service.ts's bulkEnterResults for the same shape.
    await reportCardRepository.withTransaction((tx) =>
      Promise.all(
        reportCards.map((rc, i) =>
          reportCardRepository.updateInTransaction(tx, rc.id, {
            position: i + 1,
            outOf: total,
          })
        )
      )
    );

    return {
      classId,
      termId,
      totalStudents: total,
      updated: reportCards.length,
    };
  }

  /**
   * Bulk generate report cards for an entire class
   */
  async bulkGenerateReportCards(
    classId: string,
    termId: string,
    classTeacherId: string,
    context: ServiceContext
  ) {
    // Only DEPUTY_HEAD+ can bulk generate (includes HEAD_TEACHER, ADMIN)
    requireMinimumRole(context, Role.DEPUTY_HEAD, "Only deputy heads and above can bulk generate report cards");

    // Get all enrolled students in the class
    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: {
        classId,
        status: "ACTIVE",
      },
      select: {
        studentId: true,
      },
    });

    const results = {
      successful: 0,
      failed: [] as Array<{ studentId: string; error: string }>,
    };

    for (const enrollment of enrollments) {
      try {
        await this.generateReportCard(
          {
            studentId: enrollment.studentId,
            classId,
            termId,
            classTeacherId,
          },
          context
        );
        results.successful++;
      } catch (error: any) {
        results.failed.push({
          studentId: enrollment.studentId,
          error: error.message,
        });
      }
    }

    // Calculate positions after all generated
    if (results.successful > 0) {
      await this.calculateClassPositions(classId, termId, context);
    }

    return results;
  }

  // ==================== CRUD OPERATIONS ====================

  /**
   * Get report card by ID with all relations
   */
  async getReportCardWithRelations(id: string, context: ServiceContext) {
    // TEACHER+ can view report cards (includes HOD, DEPUTY_HEAD, HEAD_TEACHER, ADMIN)
    requireMinimumRole(context, Role.TEACHER, "Only teachers and above can view report cards");

    const reportCard = await reportCardRepository.findByIdWithRelations(id);

    if (!reportCard) {
      throw new NotFoundError("Report card not found");
    }

    return reportCard;
  }

  /**
   * Update report card remarks and promotion status
   */
  async updateReportCard(
    id: string,
    data: UpdateReportCardInput,
    context: ServiceContext
  ) {
    // Only TEACHER+ can update report cards (includes HOD, DEPUTY_HEAD, HEAD_TEACHER, ADMIN)
    requireMinimumRole(context, Role.TEACHER, "Only teachers and above can update report cards");

    const reportCard = await reportCardRepository.findById(id);
    if (!reportCard) {
      throw new NotFoundError("Report card not found");
    }

    // Head teacher remarks can only be added by HEAD_TEACHER+
    if (data.headTeacherRemarks) {
      requireMinimumRole(context, Role.HEAD_TEACHER, "Only head teachers and above can add head teacher remarks");
    }

    return reportCardRepository.update(id, data);
  }

  /**
   * List report cards with filters and pagination
   */
  async listReportCards(
    filters: ReportCardFilters,
    pagination: PaginationParams,
    context: ServiceContext
  ) {
    // TEACHER+ can list report cards (includes HOD, DEPUTY_HEAD, HEAD_TEACHER, ADMIN)
    requireMinimumRole(context, Role.TEACHER, "Only teachers and above can list report cards");

    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (filters.studentId) {
      where.studentId = filters.studentId;
    }

    if (filters.classId) {
      where.classId = filters.classId;
    }

    if (filters.termId) {
      where.termId = filters.termId;
    }

    if (filters.academicYearId) {
      where.academicYearId = filters.academicYearId;
    }

    if (filters.promotionStatus) {
      where.promotionStatus = filters.promotionStatus;
    }

    const [reportCards, total] = await Promise.all([
      reportCardRepository.findMany({
        skip,
        take: pageSize,
        where,
        include: {
          student: true,
          class: {
            include: {
              grade: true,
            },
          },
          term: {
            include: {
              academicYear: true,
            },
          },
          classTeacher: true,
          subjects: {
            include: {
              subject: true,
            },
          },
        },
      }),
      reportCardRepository.count(where),
    ]);

    return {
      data: reportCards,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Delete report card
   */
  async deleteReportCard(id: string, context: ServiceContext) {
    // Only ADMIN can delete report cards
    requireMinimumRole(context, Role.ADMIN, "Only admins can delete report cards");

    const reportCard = await reportCardRepository.findById(id);
    if (!reportCard) {
      throw new NotFoundError("Report card not found");
    }

    return reportCardRepository.delete(id);
  }

}

// Singleton instance
export const reportCardService = new ReportCardService();
