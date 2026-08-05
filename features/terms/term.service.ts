import { Prisma } from "@prisma/client";
import { Term, TermType } from "@/types/prisma-enums";
import { termRepository } from "./term.repository";
import { academicYearRepository } from "../academic-years/academicYear.repository";
import { UnauthorizedError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";

/**
 * Term Service - Business Logic Layer
 *
 * Handles business rules, validation, and authorization for term operations.
 * Uses TermRepository for data access.
 */

// Service context for authorization
// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
}

// Input DTOs
export interface CreateTermInput {
  academicYearId: string;
  termType: TermType; // TERM_1, TERM_2, TERM_3
  startDate: Date;
  endDate: Date;
}

export interface UpdateTermInput {
  termType?: TermType;
  startDate?: Date;
  endDate?: Date;
}

export interface TermFilters {
  academicYearId?: string;
  termType?: TermType;
  isActive?: boolean;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export class TermService {
  // ==================== PERMISSION CHECKS ====================

  /**
   * Check if user can manage terms
   * Only ADMIN, HEAD_TEACHER, and DEPUTY_HEAD can manage terms
   */
  private canManage(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD"].includes(context.role);
  }

  /**
   * Check if user can delete terms
   * Only ADMIN can delete terms
   */
  private canDelete(context: ServiceContext): boolean {
    return context.role === "ADMIN";
  }

  /**
   * Check if user can activate terms
   * Only ADMIN and HEAD_TEACHER can activate terms
   */
  private canChangeStatus(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  // ==================== VALIDATION ====================

  /**
   * Validate term type
   */
  private validateTermType(termType: TermType): void {
    const validTypes: TermType[] = ["TERM_1", "TERM_2", "TERM_3"];
    if (!validTypes.includes(termType)) {
      throw new ValidationError("Invalid term type. Must be TERM_1, TERM_2, or TERM_3");
    }
  }

  /**
   * Validate date range
   * Start date must be before end date
   * Term typically spans ~3-4 months
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

    // Check if date range is reasonable (between 2 weeks and 6 months)
    const diffMonths =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (diffMonths < 0.5 || diffMonths > 6) {
      throw new ValidationError(
        "Term duration must be between 2 weeks and 6 months"
      );
    }
  }

  /**
   * Validate create input
   */
  private validateCreateInput(data: CreateTermInput): void {
    if (!data.academicYearId) {
      throw new ValidationError("Academic year ID is required");
    }
    this.validateTermType(data.termType);
    this.validateDateRange(data.startDate, data.endDate);
  }

  /**
   * Validate update input
   */
  private validateUpdateInput(data: UpdateTermInput): void {
    if (data.termType) {
      this.validateTermType(data.termType);
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
   * Create a new term
   */
  async createTerm(
    data: CreateTermInput,
    context: ServiceContext
  ): Promise<Term> {
    // Authorization
    if (!this.canManage(context)) {
      throw new UnauthorizedError(
        "You do not have permission to create terms"
      );
    }

    // Validation
    this.validateCreateInput(data);

    // Business rule: Academic year must exist and be open
    const academicYear = await academicYearRepository.findById(
      data.academicYearId
    );
    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    if (academicYear.isClosed) {
      throw new ValidationError(
        "Cannot create term for a closed academic year"
      );
    }

    // Business rule: Term dates must be within academic year dates
    if (
      data.startDate < academicYear.startDate ||
      data.endDate > academicYear.endDate
    ) {
      throw new ValidationError(
        "Term dates must be within the academic year dates"
      );
    }

    // Business rule: Check for duplicate term type in same academic year
    const existingTerm = await termRepository.findByYearAndType(
      data.academicYearId,
      data.termType
    );
    if (existingTerm) {
      throw new ConflictError(
        `${data.termType} already exists for this academic year`
      );
    }

    // Business rule: Check for date overlaps with other terms
    const hasOverlap = await termRepository.checkOverlap(
      data.academicYearId,
      data.startDate,
      data.endDate
    );
    if (hasOverlap) {
      throw new ConflictError(
        "Term dates overlap with an existing term in this academic year"
      );
    }

    // Create term (inactive by default)
    const term = await termRepository.create({
      academicYear: { connect: { id: data.academicYearId } },
      termType: data.termType,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: false,
    });

    return term;
  }

  /**
   * Get term by ID
   */
  async getTermById(id: string, context: ServiceContext): Promise<Term> {
    // Everyone can read terms
    const term = await termRepository.findById(id);

    if (!term) {
      throw new NotFoundError("Term not found");
    }

    return term;
  }

  /**
   * Get term with all relations
   */
  async getTermWithRelations(id: string, context: ServiceContext) {
    // Everyone can read terms
    const term = await termRepository.findByIdWithRelations(id);

    if (!term) {
      throw new NotFoundError("Term not found");
    }

    return term;
  }

  /**
   * Get the currently active term
   */
  async getActiveTerm(context: ServiceContext): ReturnType<typeof termRepository.findActive> {
    // Everyone can read the active term
    return termRepository.findActive();
  }

  /**
   * Flat list of all terms with a display-ready name and academic year,
   * newest first — used by report-viewing filter dropdowns.
   */
  async getReportTermsList() {
    const terms = await termRepository.findAllWithAcademicYear();

    return terms.map((term) => ({
      id: term.id,
      name: `${term.termType} ${term.academicYear.year}`,
      termType: term.termType,
      academicYear: term.academicYear.year,
      isActive: term.isActive,
      startDate: term.startDate,
      endDate: term.endDate,
    }));
  }

  /**
   * Get all terms for an academic year
   */
  async getTermsByAcademicYear(
    academicYearId: string,
    context: ServiceContext
  ): Promise<Term[]> {
    // Everyone can read terms
    return termRepository.findByAcademicYear(academicYearId);
  }

  /**
   * List terms with pagination and filters
   */
  async listTerms(
    filters: TermFilters,
    pagination: PaginationParams,
    context: ServiceContext
  ) {
    // Everyone can list terms

    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.TermWhereInput = {};

    if (filters.academicYearId) {
      where.academicYearId = filters.academicYearId;
    }

    if (filters.termType) {
      where.termType = filters.termType;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Fetch data
    const [terms, total] = await Promise.all([
      termRepository.findMany({
        skip,
        take: pageSize,
        where,
        orderBy: { startDate: "desc" },
        include: {
          academicYear: true,
          _count: {
            select: {
              assessments: true,
              reportCards: true,
              attendanceRecords: true,
            },
          },
        },
      }),
      termRepository.count(where),
    ]);

    return {
      data: terms,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Update term
   */
  async updateTerm(
    id: string,
    data: UpdateTermInput,
    context: ServiceContext
  ): Promise<Term> {
    // Authorization
    if (!this.canManage(context)) {
      throw new UnauthorizedError(
        "You do not have permission to update terms"
      );
    }

    // Validation
    this.validateUpdateInput(data);

    // Check if term exists
    const existingTerm = await termRepository.findById(id);
    if (!existingTerm) {
      throw new NotFoundError("Term not found");
    }

    // Business rule: Cannot update term in closed academic year
    const academicYear = await academicYearRepository.findById(
      existingTerm.academicYearId
    );
    if (academicYear?.isClosed) {
      throw new ValidationError(
        "Cannot update term in a closed academic year"
      );
    }

    // Business rule: If changing dates, check they're within academic year
    if (data.startDate && data.endDate && academicYear) {
      if (
        data.startDate < academicYear.startDate ||
        data.endDate > academicYear.endDate
      ) {
        throw new ValidationError(
          "Term dates must be within the academic year dates"
        );
      }

      // Check for overlaps with other terms
      const hasOverlap = await termRepository.checkOverlap(
        existingTerm.academicYearId,
        data.startDate,
        data.endDate,
        id // Exclude current term from overlap check
      );
      if (hasOverlap) {
        throw new ConflictError(
          "Term dates overlap with an existing term"
        );
      }
    }

    // Business rule: If changing term type, check it doesn't conflict
    if (data.termType && data.termType !== existingTerm.termType) {
      const conflictingTerm = await termRepository.findByYearAndType(
        existingTerm.academicYearId,
        data.termType
      );
      if (conflictingTerm && conflictingTerm.id !== id) {
        throw new ConflictError(
          `${data.termType} already exists for this academic year`
        );
      }
    }

    // Update
    const updatedTerm = await termRepository.update(id, {
      ...(data.termType && { termType: data.termType }),
      ...(data.startDate && { startDate: data.startDate }),
      ...(data.endDate && { endDate: data.endDate }),
    });

    return updatedTerm;
  }

  /**
   * Activate a term (deactivates others in same academic year)
   */
  async activateTerm(id: string, context: ServiceContext): Promise<Term> {
    // Authorization
    if (!this.canChangeStatus(context)) {
      throw new UnauthorizedError(
        "You do not have permission to activate terms"
      );
    }

    // Check if term exists
    const term = await termRepository.findById(id);
    if (!term) {
      throw new NotFoundError("Term not found");
    }

    // Business rule: Cannot activate term in closed or inactive academic year
    const academicYear = await academicYearRepository.findById(
      term.academicYearId
    );
    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    if (academicYear.isClosed) {
      throw new ValidationError(
        "Cannot activate term in a closed academic year"
      );
    }

    if (!academicYear.isActive) {
      throw new ValidationError(
        "Cannot activate term. Please activate the academic year first."
      );
    }

    // Activate (repository handles deactivating others in same year)
    return termRepository.setActive(id);
  }

  /**
   * Deactivate a term
   */
  async deactivateTerm(id: string, context: ServiceContext): Promise<Term> {
    // Authorization
    if (!this.canChangeStatus(context)) {
      throw new UnauthorizedError(
        "You do not have permission to deactivate terms"
      );
    }

    // Check if term exists
    const term = await termRepository.findById(id);
    if (!term) {
      throw new NotFoundError("Term not found");
    }

    if (!term.isActive) {
      throw new ValidationError("Term is already inactive");
    }

    // Deactivate
    return termRepository.deactivate(id);
  }

  /**
   * Delete a term
   */
  async deleteTerm(id: string, context: ServiceContext): Promise<void> {
    // Authorization
    if (!this.canDelete(context)) {
      throw new UnauthorizedError(
        "You do not have permission to delete terms"
      );
    }

    // Check if term exists
    const term = await termRepository.findById(id);
    if (!term) {
      throw new NotFoundError("Term not found");
    }

    // Business rule: Cannot delete the active term
    if (term.isActive) {
      throw new ValidationError(
        "Cannot delete the active term. Please deactivate it first."
      );
    }

    // Business rule: Cannot delete term with data
    const termWithRelations = await termRepository.findByIdWithRelations(id);
    if (
      termWithRelations &&
      termWithRelations._count &&
      (termWithRelations._count.assessments > 0 ||
        termWithRelations._count.reportCards > 0 ||
        termWithRelations._count.attendanceRecords > 0)
    ) {
      throw new ValidationError(
        "Cannot delete term with existing assessments, report cards, or attendance records"
      );
    }

    // Delete
    try {
      await termRepository.delete(id);
    } catch (error) {
      if (error instanceof Error) {
        throw new ValidationError(
          `Cannot delete term: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get term statistics
   */
  async getTermStatistics(id: string, context: ServiceContext) {
    // Everyone can view statistics

    const term = await termRepository.findByIdWithRelations(id);

    if (!term) {
      throw new NotFoundError("Term not found");
    }

    return {
      id: term.id,
      termType: term.termType,
      startDate: term.startDate,
      endDate: term.endDate,
      isActive: term.isActive,
      academicYear: {
        id: term.academicYear.id,
        year: term.academicYear.year,
        isActive: term.academicYear.isActive,
      },
      stats: {
        totalAssessments: term._count.assessments,
        totalReportCards: term._count.reportCards,
        totalAttendanceRecords: term._count.attendanceRecords,
      },
    };
  }
}

// Singleton instance
export const termService = new TermService();
