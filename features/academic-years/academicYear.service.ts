import { Prisma } from "@prisma/client";
import { AcademicYear } from "@/types/prisma-enums";
import { academicYearRepository } from "./academicYear.repository";
import { UnauthorizedError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";

/**
 * Academic Year Service - Business Logic Layer
 *
 * Handles business rules, validation, and authorization for academic year operations.
 * Uses AcademicYearRepository for data access.
 */

// Service context for authorization
// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
}

// Input DTOs
export interface CreateAcademicYearInput {
  year: number; // e.g., 2024, 2025
  startDate: Date;
  endDate: Date;
}

export interface UpdateAcademicYearInput {
  year?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface AcademicYearFilters {
  isActive?: boolean;
  isClosed?: boolean;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export class AcademicYearService {
  // ==================== PERMISSION CHECKS ====================

  /**
   * Check if user can manage academic years
   * Only ADMIN, HEAD_TEACHER, and DEPUTY_HEAD can manage academic years
   */
  private canManage(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD"].includes(context.role);
  }

  /**
   * Check if user can delete academic years
   * Only ADMIN can delete academic years
   */
  private canDelete(context: ServiceContext): boolean {
    return context.role === "ADMIN";
  }

  /**
   * Check if user can activate/close academic years
   * Only ADMIN and HEAD_TEACHER can activate/close years
   */
  private canChangeStatus(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  // ==================== VALIDATION ====================

  /**
   * Validate academic year number
   * Must be a 4-digit year (e.g., 2024, 2025)
   */
  private validateYear(year: number): void {
    if (!year || year < 2000 || year > 2100) {
      throw new ValidationError(
        "Invalid year. Must be between 2000 and 2100"
      );
    }
  }

  /**
   * Validate date range
   * Start date must be before end date
   * Academic year typically spans ~10 months
   */
  private validateDateRange(startDate: Date, endDate: Date): void {
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
      throw new ValidationError("Invalid start date");
    }

    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
      throw new ValidationError("Invalid end date");
    }

    if (startDate >= endDate) {
      throw new ValidationError("Start date must be before end date");
    }

    // Check if date range is reasonable (between 6 months and 18 months)
    const diffMonths =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (diffMonths < 6 || diffMonths > 18) {
      throw new ValidationError(
        "Academic year duration must be between 6 and 18 months"
      );
    }
  }

  /**
   * Validate create input
   */
  private validateCreateInput(data: CreateAcademicYearInput): void {
    this.validateYear(data.year);
    this.validateDateRange(data.startDate, data.endDate);
  }

  /**
   * Validate update input
   */
  private validateUpdateInput(data: UpdateAcademicYearInput): void {
    if (data.year !== undefined) {
      this.validateYear(data.year);
    }

    if (data.startDate && data.endDate) {
      this.validateDateRange(data.startDate, data.endDate);
    } else if (data.startDate || data.endDate) {
      throw new ValidationError(
        "Both startDate and endDate must be provided together"
      );
    }
  }

  // ==================== BUSINESS LOGIC ====================

  /**
   * Create a new academic year
   */
  async createAcademicYear(
    data: CreateAcademicYearInput,
    context: ServiceContext
  ): Promise<AcademicYear> {
    // Authorization
    if (!this.canManage(context)) {
      throw new UnauthorizedError(
        "You do not have permission to create academic years"
      );
    }

    // Validation
    this.validateCreateInput(data);

    // Business rule: Check if year already exists
    const existingYear = await academicYearRepository.findByYear(data.year);
    if (existingYear) {
      throw new ConflictError(
        `Academic year ${data.year} already exists`
      );
    }

    // Business rule: New academic years are created as inactive by default
    const academicYear = await academicYearRepository.create({
      year: data.year,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: false,
      isClosed: false,
    });

    return academicYear;
  }

  /**
   * Get academic year by ID
   */
  async getAcademicYearById(
    id: string,
    context: ServiceContext
  ): Promise<AcademicYear> {
    // Everyone can read academic years
    const academicYear = await academicYearRepository.findById(id);

    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    return academicYear;
  }

  /**
   * Get academic year with all relations
   */
  async getAcademicYearWithRelations(id: string, context: ServiceContext) {
    // Everyone can read academic years
    const academicYear =
      await academicYearRepository.findByIdWithRelations(id);

    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    return academicYear;
  }

  /**
   * Get the currently active academic year
   */
  async getActiveAcademicYear(
    context: ServiceContext
  ): Promise<AcademicYear | null> {
    // Everyone can read the active year
    return academicYearRepository.findActive();
  }

  /**
   * List academic years with pagination and filters
   */
  async listAcademicYears(
    filters: AcademicYearFilters,
    pagination: PaginationParams,
    context: ServiceContext
  ) {
    // Everyone can list academic years

    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.AcademicYearWhereInput = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isClosed !== undefined) {
      where.isClosed = filters.isClosed;
    }

    if (filters.search) {
      where.year = parseInt(filters.search);
    }

    // Fetch data
    const [academicYears, total] = await Promise.all([
      academicYearRepository.findMany({
        skip,
        take: pageSize,
        where,
        orderBy: { year: "desc" },
        include: {
          _count: {
            select: {
              terms: true,
              enrollments: true,
            },
          },
        },
      }),
      academicYearRepository.count(where),
    ]);

    return {
      data: academicYears,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Update academic year
   */
  async updateAcademicYear(
    id: string,
    data: UpdateAcademicYearInput,
    context: ServiceContext
  ): Promise<AcademicYear> {
    // Authorization
    if (!this.canManage(context)) {
      throw new UnauthorizedError(
        "You do not have permission to update academic years"
      );
    }

    // Validation
    this.validateUpdateInput(data);

    // Check if academic year exists
    const existingYear = await academicYearRepository.findById(id);
    if (!existingYear) {
      throw new NotFoundError("Academic year not found");
    }

    // Business rule: Cannot update a closed academic year
    if (existingYear.isClosed) {
      throw new ValidationError(
        "Cannot update a closed academic year. Please reopen it first."
      );
    }

    // Business rule: If changing year number, check it doesn't conflict
    if (data.year && data.year !== existingYear.year) {
      const conflictingYear = await academicYearRepository.findByYear(
        data.year
      );
      if (conflictingYear && conflictingYear.id !== id) {
        throw new ConflictError(
          `Academic year ${data.year} already exists`
        );
      }
    }

    // Update
    const updatedYear = await academicYearRepository.update(id, {
      ...(data.year && { year: data.year }),
      ...(data.startDate && { startDate: data.startDate }),
      ...(data.endDate && { endDate: data.endDate }),
    });

    return updatedYear;
  }

  /**
   * Activate an academic year (deactivates all others)
   */
  async activateAcademicYear(
    id: string,
    context: ServiceContext
  ): Promise<AcademicYear> {
    // Authorization
    if (!this.canChangeStatus(context)) {
      throw new UnauthorizedError(
        "You do not have permission to activate academic years"
      );
    }

    // Check if academic year exists
    const academicYear = await academicYearRepository.findById(id);
    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    // Business rule: Cannot activate a closed academic year
    if (academicYear.isClosed) {
      throw new ValidationError(
        "Cannot activate a closed academic year. Please reopen it first."
      );
    }

    // Activate (repository handles deactivating others)
    return academicYearRepository.setActive(id);
  }

  /**
   * Close an academic year (prevents further modifications)
   * Edge Case #9: Academic Year Closure
   */
  async closeAcademicYear(
    id: string,
    context: ServiceContext
  ): Promise<AcademicYear> {
    // Authorization
    if (!this.canChangeStatus(context)) {
      throw new UnauthorizedError(
        "You do not have permission to close academic years"
      );
    }

    // Check if academic year exists
    const academicYear = await academicYearRepository.findById(id);
    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    // Business rule: Already closed
    if (academicYear.isClosed) {
      throw new ValidationError("Academic year is already closed");
    }

    // Business rule: Validate year can be closed
    const canCloseCheck = await this.canCloseAcademicYear(id);
    if (!canCloseCheck.canClose) {
      throw new ValidationError(
        `Cannot close academic year. Issues found:\n${canCloseCheck.reasons.join("\n")}`
      );
    }

    // Business rule: Warn if closing the active year
    if (academicYear.isActive) {
      // This is allowed, but will deactivate it
      console.warn(
        `Closing active academic year ${academicYear.year}. It will be deactivated.`
      );
    }

    // Close (also deactivates)
    return academicYearRepository.close(id);
  }

  /**
   * Reopen a closed academic year
   */
  async reopenAcademicYear(
    id: string,
    context: ServiceContext
  ): Promise<AcademicYear> {
    // Authorization
    if (!this.canChangeStatus(context)) {
      throw new UnauthorizedError(
        "You do not have permission to reopen academic years"
      );
    }

    // Check if academic year exists
    const academicYear = await academicYearRepository.findById(id);
    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    // Business rule: Already open
    if (!academicYear.isClosed) {
      throw new ValidationError("Academic year is already open");
    }

    // Reopen
    return academicYearRepository.reopen(id);
  }

  /**
   * Delete an academic year
   */
  async deleteAcademicYear(
    id: string,
    context: ServiceContext
  ): Promise<void> {
    // Authorization
    if (!this.canDelete(context)) {
      throw new UnauthorizedError(
        "You do not have permission to delete academic years"
      );
    }

    // Check if academic year exists
    const academicYear = await academicYearRepository.findById(id);
    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    // Business rule: Cannot delete the active academic year
    if (academicYear.isActive) {
      throw new ValidationError(
        "Cannot delete the active academic year. Please activate another year first."
      );
    }

    // Business rule: Cannot delete a closed year with data
    if (academicYear.isClosed) {
      const stats = await academicYearRepository.getStatistics(id);
      if (
        stats &&
        stats._count &&
        (stats._count.enrollments > 0 ||
          stats._count.reportCards > 0 ||
          stats._count.classTimetables > 0 ||
          stats._count.secondaryTimetables > 0)
      ) {
        throw new ValidationError(
          "Cannot delete a closed academic year with existing enrollments, report cards, or timetables"
        );
      }
    }

    // Delete
    try {
      await academicYearRepository.delete(id);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("existing enrollments")) {
          throw new ValidationError(
            "Cannot delete academic year with existing enrollments. Please remove enrollments first."
          );
        }
      }
      throw error;
    }
  }

  /**
   * Get academic year statistics
   */
  async getAcademicYearStatistics(id: string, context: ServiceContext) {
    // Everyone can view statistics

    const stats = await academicYearRepository.getStatistics(id);

    if (!stats) {
      throw new NotFoundError("Academic year not found");
    }

    return {
      id: stats.id,
      year: stats.year,
      isActive: stats.isActive,
      isClosed: stats.isClosed,
      startDate: stats.startDate,
      endDate: stats.endDate,
      stats: {
        totalTerms: stats._count.terms,
        totalEnrollments: stats._count.enrollments,
        totalClassTeacherAssignments: stats._count.classTeacherAssignments,
        totalSubjectTeacherAssignments:
          stats._count.subjectTeacherAssignments,
        totalClassTimetables: stats._count.classTimetables,
        totalSecondaryTimetables: stats._count.secondaryTimetables,
        totalReportCards: stats._count.reportCards,
      },
    };
  }

  // ==================== EDGE CASE VALIDATORS ====================

  /**
   * Edge Case #9: Check if academic year can be closed
   *
   * Validates:
   * - All assessments are completed (not DRAFT)
   * - All students have report cards for all terms
   * - No pending operations
   */
  async canCloseAcademicYear(academicYearId: string): Promise<{
    canClose: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    const academicYear = await academicYearRepository.findById(academicYearId);
    if (!academicYear) {
      reasons.push("Academic year not found");
      return { canClose: false, reasons };
    }

    // Import prisma at runtime to avoid circular dependencies
    const { default: prisma } = await import("@/lib/db/prisma");

    // Check for pending assessments (DRAFT status)
    const pendingAssessments = await prisma.assessment.count({
      where: {
        term: { academicYearId },
        status: "DRAFT",
      },
    });

    if (pendingAssessments > 0) {
      reasons.push(`${pendingAssessments} assessments are still in DRAFT status`);
    }

    // Check if all active students have report cards for all terms
    const terms = await prisma.term.findMany({
      where: { academicYearId },
      select: { id: true },
    });

    const activeEnrollments = await prisma.studentClassEnrollment.count({
      where: {
        academicYearId,
        status: "ACTIVE",
      },
    });

    const reportCardCount = await prisma.reportCard.count({
      where: { academicYearId },
    });

    // Expected: one report card per student per term
    const expectedReportCards = activeEnrollments * terms.length;

    if (reportCardCount < expectedReportCards) {
      reasons.push(
        `Missing report cards: Expected ${expectedReportCards}, found ${reportCardCount}`
      );
    }

    return {
      canClose: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Edge Case #9: Check if academic year can be reopened
   *
   * Validates:
   * - Year is currently closed
   * - No newer active academic year exists
   */
  async canReopenAcademicYear(academicYearId: string): Promise<{
    canReopen: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    const academicYear = await academicYearRepository.findById(academicYearId);

    if (!academicYear) {
      reasons.push("Academic year not found");
      return { canReopen: false, reasons };
    }

    if (!academicYear.isClosed) {
      reasons.push("Academic year is not closed");
    }

    // Check if a newer academic year exists and is active
    const newerActiveYear = await academicYearRepository.findMany({
      where: {
        year: { gt: academicYear.year },
        isActive: true,
      },
      take: 1,
    });

    if (newerActiveYear.length > 0) {
      reasons.push(
        `Cannot reopen: A newer academic year (${newerActiveYear[0].year}) is already active`
      );
    }

    return {
      canReopen: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Edge Case #9: Validate if year is open for operations
   *
   * Used by other services to check before:
   * - Creating assessments
   * - Marking attendance
   * - Creating enrollments
   */
  async validateYearIsOpen(academicYearId: string): Promise<void> {
    const academicYear = await academicYearRepository.findById(academicYearId);

    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    if (academicYear.isClosed) {
      throw new ValidationError(
        `Academic year ${academicYear.year} is closed. No modifications allowed.`
      );
    }
  }

  /**
   * Edge Case #9: Validate if term is open for operations
   */
  async validateTermIsOpen(termId: string): Promise<void> {
    // Import prisma at runtime to avoid circular dependencies
    const { default: prisma } = await import("@/lib/db/prisma");

    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        academicYear: {
          select: { isClosed: true, year: true },
        },
      },
    });

    if (!term) {
      throw new NotFoundError("Term not found");
    }

    if (term.academicYear.isClosed) {
      throw new ValidationError(
        `Academic year ${term.academicYear.year} is closed. Cannot modify term data.`
      );
    }
  }
}

// Singleton instance
export const academicYearService = new AcademicYearService();
