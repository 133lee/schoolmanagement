import { Prisma } from "@prisma/client";
import { Assessment, ExamType, AssessmentStatus, Role } from "@/types/prisma-enums";
import { assessmentRepository } from "./assessment.repository";
import { studentAssessmentResultRepository } from "../assessment-results/studentAssessmentResult.repository";
import { subjectRepository } from "../subjects/subject.repository";
import { classRepository } from "../classes/class.repository";
import { termRepository } from "../terms/term.repository";
import { calculateECZGrade } from "@/lib/grading/ecz-grading-system";
import { UnauthorizedError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireMinimumRole, AuthContext } from "@/lib/auth/authorization";
import { hasRoleAuthority } from "@/lib/auth/role-hierarchy";
import prisma from "@/lib/db/prisma";

/**
 * Assessment Service - Business Logic Layer
 *
 * Manages assessments (exams, tests, quizzes).
 * Handles creation, grading, and analysis.
 */

// Custom Error Classes
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

// Service context for authorization
export type ServiceContext = AuthContext;

// Input DTOs
export interface CreateAssessmentInput {
  title: string;
  description?: string;
  subjectId: string;
  classId: string;
  termId: string;
  examType: ExamType;
  totalMarks?: number;
  passMark?: number;
  weight?: number;
  assessmentDate?: Date;
}

export interface UpdateAssessmentInput {
  title?: string;
  description?: string;
  totalMarks?: number;
  passMark?: number;
  weight?: number;
  assessmentDate?: Date;
  status?: AssessmentStatus;
}

export interface AssessmentFilters {
  subjectId?: string;
  classId?: string;
  termId?: string;
  examType?: ExamType;
  status?: AssessmentStatus;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface EnterResultInput {
  studentId: string;
  marksObtained: number;
  isAbsent?: boolean;
  remarks?: string;
}

export class AssessmentService {
  // ==================== PERMISSION CHECKS ====================

  /**
   * Check if user can delete assessments
   * Only HEAD_TEACHER and ADMIN can delete assessments
   */
  private canDeleteAssessments(context: ServiceContext): boolean {
    return hasRoleAuthority(context.role, Role.HEAD_TEACHER);
  }

  /**
   * Check if user can manage assessments (create/update/enter results)
   * Teachers and above can manage assessments
   */
  private canManageAssessments(context: ServiceContext): boolean {
    return hasRoleAuthority(context.role, Role.TEACHER);
  }

  /**
   * A plain TEACHER (not ADMIN/HEAD_TEACHER/DEPUTY_HEAD, not an HOD of the
   * subject's department) may only read or write assessments/results for a
   * class+subject they actually teach — either as that class's class teacher
   * (PRIMARY grades imply all subjects) or via a direct subject-teacher
   * assignment. Role level alone (canManageAssessments) doesn't establish
   * that; this closes the gap where any teacher account could read or enter
   * marks for a subject/class they have nothing to do with.
   */
  private async verifyAssessmentAccess(
    context: ServiceContext,
    classId: string,
    subjectId: string
  ): Promise<void> {
    if (hasRoleAuthority(context.role, Role.DEPUTY_HEAD)) return;

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { departmentId: true },
    });
    if (subject?.departmentId) {
      const { isHODOfDepartment } = await import("@/lib/auth/position-helpers");
      if (await isHODOfDepartment(context.userId, subject.departmentId)) return;
    }

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId: context.userId },
      select: { id: true },
    });
    if (!teacher) {
      throw new UnauthorizedError("Teacher profile not found");
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (!academicYear) {
      throw new UnauthorizedError("No active academic year found");
    }

    const subjectAssignment = await prisma.subjectTeacherAssignment.findFirst({
      where: { teacherId: teacher.id, classId, subjectId, academicYearId: academicYear.id },
      select: { id: true },
    });
    if (subjectAssignment) return;

    const classTeacherAssignment = await prisma.classTeacherAssignment.findFirst({
      where: { teacherId: teacher.id, classId, academicYearId: academicYear.id },
      include: { class: { include: { grade: true } } },
    });
    if (classTeacherAssignment?.class.grade.schoolLevel === "PRIMARY") return;

    throw new UnauthorizedError("You do not teach this subject in this class");
  }

  // ==================== VALIDATION ====================

  /**
   * Validate assessment data
   */
  private validateAssessmentData(data: CreateAssessmentInput): void {
    // Validate total marks
    if (data.totalMarks && (data.totalMarks <= 0 || data.totalMarks > 1000)) {
      throw new ValidationError("Total marks must be between 1 and 1000");
    }

    // Validate pass mark
    const totalMarks = data.totalMarks || 100;
    const passMark = data.passMark || 50;

    if (passMark < 0 || passMark > totalMarks) {
      throw new ValidationError(
        `Pass mark must be between 0 and ${totalMarks}`
      );
    }

    // Validate weight
    if (data.weight && (data.weight < 0 || data.weight > 10)) {
      throw new ValidationError("Weight must be between 0 and 10");
    }

    // Validate assessment date is not too far in future
    if (data.assessmentDate) {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      if (data.assessmentDate > oneYearFromNow) {
        throw new ValidationError(
          "Assessment date cannot be more than 1 year in the future"
        );
      }
    }
  }

  /**
   * Validate that assessment date is within term dates
   */
  private async validateAssessmentDateInTerm(
    assessmentDate: Date,
    termId: string
  ): Promise<void> {
    const term = await termRepository.findById(termId);
    if (!term) {
      throw new NotFoundError("Term not found");
    }

    if (assessmentDate < term.startDate || assessmentDate > term.endDate) {
      throw new ValidationError(
        "Assessment date must be within term dates"
      );
    }
  }

  /**
   * Validate that subject exists in the class curriculum (ClassSubject)
   * This ensures assessments can only be created for subjects that are
   * part of the class's official curriculum.
   */
  private async validateClassSubject(
    subjectId: string,
    classId: string
  ): Promise<void> {
    const classSubject = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
    });

    if (!classSubject) {
      const [subject, classEntity] = await Promise.all([
        subjectRepository.findById(subjectId),
        classRepository.findById(classId),
      ]);

      const className = classEntity?.name || "this class";
      const subjectName = subject?.name || "Subject";

      throw new ValidationError(
        `${subjectName} is not in the curriculum for ${className}. ` +
        `Cannot create an assessment for a subject not in the class curriculum.`
      );
    }
  }

  // ==================== BUSINESS LOGIC ====================

  /**
   * Create a new assessment
   */
  async createAssessment(
    data: CreateAssessmentInput,
    context: ServiceContext
  ): Promise<Assessment> {
    // Authorization: Teachers and above can create assessments
    requireMinimumRole(
      context,
      Role.TEACHER,
      "You do not have permission to create assessments"
    );

    // ...but only for a class+subject they actually teach.
    await this.verifyAssessmentAccess(context, data.classId, data.subjectId);

    // Validate data
    this.validateAssessmentData(data);

    // Validate references exist
    const [subject, classEntity, term] = await Promise.all([
      subjectRepository.findById(data.subjectId),
      classRepository.findById(data.classId),
      termRepository.findByIdWithRelations(data.termId),
    ]);

    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    if (!term) {
      throw new NotFoundError("Term not found");
    }

    // Business rule: Cannot create assessment in closed academic year
    if (term.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot create assessment in a closed academic year"
      );
    }

    // Business rule: Subject must be in the class curriculum (ClassSubject)
    // This is the AUTHORITATIVE check - ensures curriculum integrity
    await this.validateClassSubject(data.subjectId, data.classId);

    // Validate assessment date is within term dates
    if (data.assessmentDate) {
      await this.validateAssessmentDateInTerm(data.assessmentDate, data.termId);
    }

    // Create assessment
    const assessment = await assessmentRepository.create({
      title: data.title,
      description: data.description,
      subject: { connect: { id: data.subjectId } },
      class: { connect: { id: data.classId } },
      term: { connect: { id: data.termId } },
      examType: data.examType,
      totalMarks: data.totalMarks || 100,
      passMark: data.passMark || 50,
      weight: data.weight || 1.0,
      assessmentDate: data.assessmentDate,
      status: AssessmentStatus.DRAFT,
    });

    return assessment;
  }

  /**
   * Get assessment by ID
   */
  async getAssessmentById(
    id: string,
    context: ServiceContext
  ): Promise<Assessment> {
    // Everyone can read assessments
    const assessment = await assessmentRepository.findById(id);

    if (!assessment) {
      throw new NotFoundError("Assessment not found");
    }

    return assessment;
  }

  /**
   * Get assessment with relations
   */
  async getAssessmentWithRelations(id: string, context: ServiceContext) {
    // Everyone can read assessments
    const assessment = await assessmentRepository.findByIdWithRelations(id);

    if (!assessment) {
      throw new NotFoundError("Assessment not found");
    }

    return assessment;
  }

  /**
   * For a plain TEACHER (not ADMIN/HEAD_TEACHER/DEPUTY_HEAD), scope assessment
   * listing to only the (class, subject) combinations they actually teach —
   * reusing teacherClassService's own resolution of that so this doesn't
   * re-derive class-teacher/subject-teacher logic a second time — plus any
   * subject in a department they're HOD of. Returns null when the requester
   * already has full visibility (no scoping needed).
   */
  private async getTeacherAssessmentScope(
    context: ServiceContext
  ): Promise<Prisma.AssessmentWhereInput | null> {
    if (hasRoleAuthority(context.role, Role.DEPUTY_HEAD)) return null;

    const orConditions: Prisma.AssessmentWhereInput[] = [];

    const { getHODDepartment } = await import("@/lib/auth/position-helpers");
    const hodDepartment = await getHODDepartment(context.userId);
    if (hodDepartment) {
      orConditions.push({ subject: { departmentId: hodDepartment.id } });
    }

    const { teacherClassService } = await import("../teachers/teacher-class.service");
    const { allClasses } = await teacherClassService.getClassesForTeacher(context.userId);
    for (const c of allClasses) {
      if (c.teachingSubjects && c.teachingSubjects.length > 0) {
        for (const s of c.teachingSubjects) {
          orConditions.push({ classId: c.id, subjectId: s.id });
        }
      } else if (c.teachingSubjectId) {
        orConditions.push({ classId: c.id, subjectId: c.teachingSubjectId });
      } else if (c.isClassTeacher) {
        // Primary-grade class teacher: teaches every subject in this class.
        orConditions.push({ classId: c.id });
      }
    }

    if (orConditions.length === 0) {
      // A bare `OR: []` is not reliably treated as "matches nothing" by
      // Prisma — an `in: []` filter is guaranteed to match zero rows
      // regardless. A teacher with no class/subject assignments at all
      // should see no assessments.
      return { classId: { in: [] } };
    }
    return { OR: orConditions };
  }

  /**
   * List assessments with filters
   */
  async listAssessments(
    filters: AssessmentFilters,
    pagination: PaginationParams,
    context: ServiceContext
  ) {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.AssessmentWhereInput = {};

    if (filters.subjectId) {
      where.subjectId = filters.subjectId;
    }

    if (filters.classId) {
      where.classId = filters.classId;
    }

    if (filters.termId) {
      where.termId = filters.termId;
    }

    if (filters.examType) {
      where.examType = filters.examType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const scope = await this.getTeacherAssessmentScope(context);
    const finalWhere: Prisma.AssessmentWhereInput = scope ? { AND: [where, scope] } : where;

    // Fetch data
    const [assessments, total] = await Promise.all([
      assessmentRepository.findMany({
        skip,
        take: pageSize,
        where: finalWhere,
        include: {
          subject: true,
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
          _count: {
            select: {
              results: true,
            },
          },
        },
        orderBy: { assessmentDate: "desc" },
      }),
      assessmentRepository.count(finalWhere),
    ]);

    return {
      data: assessments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Update assessment
   */
  async updateAssessment(
    id: string,
    data: UpdateAssessmentInput,
    context: ServiceContext
  ): Promise<Assessment> {
    // Authorization: Teachers and above can update assessments
    requireMinimumRole(
      context,
      Role.TEACHER,
      "You do not have permission to update assessments"
    );

    // Check if assessment exists
    const existingAssessment =
      await assessmentRepository.findByIdWithRelations(id);
    if (!existingAssessment) {
      throw new NotFoundError("Assessment not found");
    }

    // Business rule: Cannot update published/completed assessment if it has results
    if (
      existingAssessment.status !== AssessmentStatus.DRAFT &&
      (await assessmentRepository.hasResults(id))
    ) {
      throw new ValidationError(
        "Cannot update assessment that has results. Delete results first."
      );
    }

    // Business rule: Cannot update in closed year
    if (existingAssessment.term.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot update assessment in a closed academic year"
      );
    }

    // Validate data
    if (data.totalMarks || data.passMark) {
      const totalMarks = data.totalMarks || existingAssessment.totalMarks;
      const passMark = data.passMark || existingAssessment.passMark;

      if (passMark > totalMarks) {
        throw new ValidationError(
          "Pass mark cannot be greater than total marks"
        );
      }
    }

    // Validate assessment date is within term dates
    if (data.assessmentDate) {
      await this.validateAssessmentDateInTerm(
        data.assessmentDate,
        existingAssessment.termId
      );
    }

    // Update
    const updatedAssessment = await assessmentRepository.update(id, data);

    return updatedAssessment;
  }

  /**
   * Publish assessment (make it available for grading)
   */
  async publishAssessment(
    id: string,
    context: ServiceContext
  ): Promise<Assessment> {
    // Authorization: Teachers and above can publish assessments
    requireMinimumRole(
      context,
      Role.TEACHER,
      "You do not have permission to publish assessments"
    );

    const assessment = await assessmentRepository.findById(id);
    if (!assessment) {
      throw new NotFoundError("Assessment not found");
    }

    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new ValidationError("Only draft assessments can be published");
    }

    // Check that the admin-configured entry window is currently open
    const window = await prisma.assessmentWindow.findUnique({
      where: {
        termId_examType: {
          termId: assessment.termId,
          examType: assessment.examType,
        },
      },
    });

    if (!window) {
      throw new ValidationError(
        "No entry window has been configured for this exam type and term. Ask the admin to set one before publishing."
      );
    }

    const now = new Date();
    if (now < window.opensAt) {
      throw new ValidationError(
        `Entry window has not opened yet. It opens on ${window.opensAt.toLocaleString()}.`
      );
    }
    if (now > window.closesAt) {
      throw new ValidationError(
        `Entry window has already closed. It closed on ${window.closesAt.toLocaleString()}.`
      );
    }

    return assessmentRepository.updateStatus(id, AssessmentStatus.PUBLISHED);
  }

  /**
   * Complete assessment (finalize grading)
   */
  async completeAssessment(
    id: string,
    context: ServiceContext
  ): Promise<Assessment> {
    // Authorization: Teachers and above can complete assessments
    requireMinimumRole(
      context,
      Role.TEACHER,
      "You do not have permission to complete assessments"
    );

    const assessment = await assessmentRepository.findById(id);
    if (!assessment) {
      throw new NotFoundError("Assessment not found");
    }

    if (assessment.status !== AssessmentStatus.PUBLISHED) {
      throw new ValidationError("Only published assessments can be completed");
    }

    return assessmentRepository.updateStatus(id, AssessmentStatus.COMPLETED);
  }

  /**
   * Reopen a completed assessment (undo completion). Symmetric with
   * completeAssessment — anyone who can mark an assessment complete can
   * also undo that, including a teacher correcting their own accidental
   * click. There's no separate "admin override" tier: completion itself
   * already isn't teacher-exclusive (requireMinimumRole(TEACHER) passes
   * for HEAD_TEACHER/DEPUTY_HEAD/ADMIN too), so reopening mirrors the
   * same rule rather than introducing a new one.
   */
  async reopenAssessment(
    id: string,
    context: ServiceContext
  ): Promise<Assessment> {
    requireMinimumRole(
      context,
      Role.TEACHER,
      "You do not have permission to reopen assessments"
    );

    const assessment = await assessmentRepository.findById(id);
    if (!assessment) {
      throw new NotFoundError("Assessment not found");
    }

    if (assessment.status !== AssessmentStatus.COMPLETED) {
      throw new ValidationError("Only completed assessments can be reopened");
    }

    return assessmentRepository.updateStatus(id, AssessmentStatus.PUBLISHED);
  }

  /**
   * Delete assessment
   */
  async deleteAssessment(
    id: string,
    context: ServiceContext
  ): Promise<void> {
    // Check if assessment exists
    const assessment = await assessmentRepository.findByIdWithRelations(id);
    if (!assessment) {
      throw new NotFoundError("Assessment not found");
    }

    // Authorization - Teachers can only delete their own DRAFT assessments
    // Admins and HEAD_TEACHER can delete any draft assessment
    const isAdmin = hasRoleAuthority(context.role, Role.ADMIN);
    const isHeadTeacher = hasRoleAuthority(context.role, Role.HEAD_TEACHER);
    const isTeacher = context.role === Role.TEACHER;

    if (!isAdmin && !isHeadTeacher) {
      // Teachers can only delete DRAFT assessments
      if (assessment.status !== AssessmentStatus.DRAFT) {
        throw new UnauthorizedError(
          "You can only delete draft assessments. Published or completed assessments cannot be deleted."
        );
      }

      // Teachers can only delete assessments they have permission to manage
      if (!isTeacher) {
        throw new UnauthorizedError(
          "You do not have permission to delete assessments"
        );
      }
    }

    // Business rule: Cannot delete from closed year
    if (assessment.term.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot delete assessment from a closed academic year"
      );
    }

    // Business rule: Admins/Head Teachers cannot delete published assessments with results
    if (assessment.status !== AssessmentStatus.DRAFT) {
      const results = await studentAssessmentResultRepository.findByAssessmentId(id);
      if (results && results.length > 0) {
        throw new ValidationError(
          "Cannot delete assessment with existing results. Delete results first."
        );
      }
    }

    // Delete assessment
    await assessmentRepository.delete(id);
  }

  /**
   * Get all results for an assessment
   */
  async getAssessmentResults(id: string, context: ServiceContext) {
    const assessment = await assessmentRepository.findById(id);
    if (!assessment) {
      throw new NotFoundError("Assessment not found");
    }

    await this.verifyAssessmentAccess(context, assessment.classId, assessment.subjectId);

    return studentAssessmentResultRepository.findByAssessmentId(id);
  }

  /**
   * Enter/update a single student result
   */
  async enterResult(
    assessmentId: string,
    data: EnterResultInput,
    context: ServiceContext
  ) {
    // Authorization
    if (!this.canManageAssessments(context)) {
      throw new UnauthorizedError(
        "You do not have permission to enter results"
      );
    }

    // Check if assessment exists
    const assessment = await assessmentRepository.findByIdWithRelations(
      assessmentId
    );
    if (!assessment) {
      throw new NotFoundError("Assessment not found");
    }

    await this.verifyAssessmentAccess(context, assessment.classId, assessment.subjectId);

    // Business rule: Assessment must be published to enter results
    if (assessment.status === AssessmentStatus.DRAFT) {
      throw new ValidationError(
        "Cannot enter results for draft assessment. Publish it first."
      );
    }

    // Business rule: Cannot enter results in closed year
    if (assessment.term.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot enter results in a closed academic year"
      );
    }

    let marksToStore = data.marksObtained;
    let gradeToStore: any = undefined;

    if (data.isAbsent) {
      // Absent students: store 0 marks, no ECZ grade, isAbsent=true
      marksToStore = 0;
      gradeToStore = null;
    } else {
      // Validate marks only for present students
      if (data.marksObtained < 0 || data.marksObtained > assessment.totalMarks) {
        throw new ValidationError(
          `Marks must be between 0 and ${assessment.totalMarks}`
        );
      }

      // Calculate grade using centralized grading system
      const percentage = (data.marksObtained / assessment.totalMarks) * 100;

      // Cast to `any`: findById includes { grade: true } at runtime but the
      // declared return type is the base Class without the relation.
      const classWithGrade = (await classRepository.findById(assessment.classId)) as any;
      if (!classWithGrade || !classWithGrade.grade) {
        throw new NotFoundError("Class or grade information not found");
      }

      const { resolveECZLevel } = await import("@/lib/grading/ecz-grading-system");
      const gradeLevel = resolveECZLevel(classWithGrade.grade.level, classWithGrade.grade.name, classWithGrade.name);
      gradeToStore = calculateECZGrade(percentage, gradeLevel);
    }

    // Check if result already exists
    const existingResult =
      await studentAssessmentResultRepository.findByStudentAssessmentSubject(
        data.studentId,
        assessmentId,
        assessment.subjectId
      );

    if (existingResult) {
      return studentAssessmentResultRepository.update(existingResult.id, {
        marksObtained: marksToStore,
        isAbsent: data.isAbsent ?? false,
        grade: gradeToStore,
        remarks: data.remarks,
      });
    } else {
      return studentAssessmentResultRepository.create({
        studentId: data.studentId,
        assessmentId,
        subjectId: assessment.subjectId,
        marksObtained: marksToStore,
        isAbsent: data.isAbsent ?? false,
        grade: gradeToStore,
        remarks: data.remarks,
      });
    }
  }

  /**
   * Bulk enter results for multiple students — optimised.
   *
   * Old approach: called enterResult() in a serial for-loop, which issued
   * 4 DB round-trips per student (fetch assessment, fetch class, find
   * existing result, create/update).  For a class of 30 students that
   * is 120 sequential queries — a serious bottleneck under load.
   *
   * New approach:
   *   1. Fetch assessment ONCE
   *   2. Fetch class + derive gradeLevel ONCE
   *   3. Fetch ALL existing results for this assessment in ONE findMany
   *   4. Compute grades locally (pure CPU, no DB)
   *   5. Execute ALL creates + updates in a SINGLE prisma.$transaction
   *
   * Result: 4 queries + 1 transaction regardless of class size.
   */
  async bulkEnterResults(
    assessmentId: string,
    results: EnterResultInput[],
    context: ServiceContext
  ) {
    // Authorization
    if (!this.canManageAssessments(context)) {
      throw new UnauthorizedError(
        "You do not have permission to enter results"
      );
    }

    if (results.length === 0) {
      return { successful: 0, failed: [] };
    }

    // ── 1. Fetch assessment ONCE ──────────────────────────────────────────
    const assessment = await assessmentRepository.findByIdWithRelations(assessmentId);
    if (!assessment) {
      throw new NotFoundError("Assessment not found");
    }

    await this.verifyAssessmentAccess(context, assessment.classId, assessment.subjectId);

    if (assessment.status === AssessmentStatus.DRAFT) {
      throw new ValidationError(
        "Cannot enter results for draft assessment. Publish it first."
      );
    }

    if (assessment.term.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot enter results in a closed academic year"
      );
    }

    // ── 2. Fetch class + derive gradeLevel ONCE ───────────────────────────
    // Cast to `any` because findById declares Class as its return type but the
    // Prisma call includes { grade: true }, which isn't reflected in that type.
    const classWithGrade = (await classRepository.findById(assessment.classId)) as any;
    if (!classWithGrade || !classWithGrade.grade) {
      throw new NotFoundError("Class or grade information not found");
    }

    const { resolveECZLevel } = await import("@/lib/grading/ecz-grading-system");
    const gradeLevel = resolveECZLevel(
      classWithGrade.grade.level,
      classWithGrade.grade.name,
      classWithGrade.name
    );

    // ── 3. Fetch ALL existing results for this assessment in ONE query ─────
    const studentIds = results.map((r) => r.studentId);
    const existingRows = await prisma.studentAssessmentResult.findMany({
      where: { assessmentId, studentId: { in: studentIds } },
      select: { id: true, studentId: true },
    });
    // Map studentId → existing record id for O(1) lookup
    const existingMap = new Map(existingRows.map((r) => [r.studentId, r.id]));

    // ── 4. Compute grades locally; split into creates / updates ───────────
    const toCreate: Array<{
      studentId: string;
      assessmentId: string;
      subjectId: string;
      marksObtained: number;
      isAbsent: boolean;
      grade: any;
      remarks?: string;
    }> = [];
    const toUpdate: Array<{ id: string; marksObtained: number; isAbsent: boolean; grade: any; remarks?: string }> = [];
    const failed: Array<{ studentId: string; error: string }> = [];

    for (const input of results) {
      try {
        let marksToStore = input.marksObtained;
        let gradeToStore: any = null;

        if (input.isAbsent) {
          // Absent: 0 marks, no ECZ grade, isAbsent flag
          marksToStore = 0;
          gradeToStore = null;
        } else {
          if (input.marksObtained < 0 || input.marksObtained > assessment.totalMarks) {
            throw new ValidationError(
              `Marks must be between 0 and ${assessment.totalMarks}`
            );
          }
          const percentage = (input.marksObtained / assessment.totalMarks) * 100;
          gradeToStore = calculateECZGrade(percentage, gradeLevel);
        }

        const existingId = existingMap.get(input.studentId);
        if (existingId) {
          toUpdate.push({
            id: existingId,
            marksObtained: marksToStore,
            isAbsent: input.isAbsent ?? false,
            grade: gradeToStore,
            remarks: input.remarks,
          });
        } else {
          toCreate.push({
            studentId: input.studentId,
            assessmentId,
            subjectId: assessment.subjectId,
            marksObtained: marksToStore,
            isAbsent: input.isAbsent ?? false,
            grade: gradeToStore,
            remarks: input.remarks,
          });
        }
      } catch (error: any) {
        failed.push({
          studentId: input.studentId,
          error: error.message || "Unknown error",
        });
      }
    }

    // ── 5. Execute ALL writes in a single transaction ─────────────────────
    const writeOps = [
      ...(toCreate.length > 0
        ? [prisma.studentAssessmentResult.createMany({ data: toCreate, skipDuplicates: true })]
        : []),
      ...toUpdate.map(({ id, ...data }) =>
        prisma.studentAssessmentResult.update({ where: { id }, data })
      ),
    ];

    if (writeOps.length > 0) {
      await prisma.$transaction(writeOps);
    }

    return {
      successful: toCreate.length + toUpdate.length,
      failed,
    };
  }

  /**
   * Get assessment statistics
   */
  async getAssessmentStatistics(id: string, context: ServiceContext) {
    // Everyone can view statistics
    const assessment = await assessmentRepository.findByIdWithRelations(id);
    if (!assessment) {
      throw new NotFoundError("Assessment not found");
    }

    const results = await studentAssessmentResultRepository.findByAssessmentId(
      id
    );

    if (results.length === 0) {
      return {
        totalStudents: 0,
        gradedStudents: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        passRate: 0,
        gradeDistribution: {},
      };
    }

    // Exclude absent students from statistical calculations
    const presentResults = results.filter((r) => !(r as any).isAbsent);
    const absentCount = results.length - presentResults.length;

    const marks = presentResults.map((r) => r.marksObtained);
    const total = marks.reduce((sum, mark) => sum + mark, 0);
    const average = marks.length > 0 ? total / marks.length : 0;
    const passed = presentResults.filter(
      (r) => r.marksObtained >= assessment.passMark
    ).length;

    // Grade distribution (absent shown separately)
    const gradeDistribution: Record<string, number> = {};
    presentResults.forEach((result) => {
      const grade = result.grade || "UNGRADED";
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    });
    if (absentCount > 0) gradeDistribution["AB"] = absentCount;

    return {
      totalStudents: results.length,
      gradedStudents: presentResults.length,
      absentCount,
      average: Math.round(average * 100) / 100,
      highest: marks.length > 0 ? Math.max(...marks) : 0,
      lowest: marks.length > 0 ? Math.min(...marks) : 0,
      passRate: presentResults.length > 0 ? Math.round((passed / presentResults.length) * 100 * 100) / 100 : 0,
      gradeDistribution,
    };
  }
}

// Singleton instance
export const assessmentService = new AssessmentService();
