import { Prisma } from "@prisma/client";
import { Subject } from "@/types/prisma-enums";
import { subjectRepository } from "./subject.repository";
import { SUBJECT_VALIDATION_MODE } from "@/config/subject-validation.config";
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

/**
 * Subject Service - Business Logic Layer
 *
 * Handles business rules, validation, and authorization for subject operations.
 * Uses SubjectRepository for data access.
 */

// Service context for authorization
// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
}

// Input DTOs
export interface CreateSubjectInput {
  name: string;
  code: string;
  description?: string;
  departmentId?: string;
}

export interface UpdateSubjectInput {
  name?: string;
  code?: string;
  description?: string;
  departmentId?: string;
}

export interface SubjectFilters {
  departmentId?: string;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export class SubjectService {
  // ==================== PERMISSION CHECKS ====================

  /**
   * Check if user can create subjects
   * Only ADMIN and HEAD_TEACHER can create subjects
   */
  private canCreate(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  /**
   * Check if user can update subjects
   * Only ADMIN and HEAD_TEACHER can update subjects
   */
  private canUpdate(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  /**
   * Check if user can delete subjects
   * Only ADMIN can delete subjects
   */
  private canDelete(context: ServiceContext): boolean {
    return context.role === "ADMIN";
  }

  // ==================== VALIDATION ====================

  /**
   * Validate subject name format
   * Subject names should be alphanumeric and max 100 characters
   */
  private validateSubjectName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError("Subject name is required");
    }

    if (name.length > 100) {
      throw new ValidationError("Subject name must not exceed 100 characters");
    }

    const nameRegex = /^[a-zA-Z0-9\s\-&()]+$/;
    if (!nameRegex.test(name)) {
      throw new ValidationError(
        "Subject name must contain only letters, numbers, spaces, hyphens, ampersands, and parentheses"
      );
    }
  }

  /**
   * Validate subject code format
   * Codes should be uppercase alphanumeric, 2-20 characters
   */
  private validateSubjectCode(code: string): void {
    if (!code || code.trim().length === 0) {
      throw new ValidationError("Subject code is required");
    }

    if (code.length < 2 || code.length > 20) {
      throw new ValidationError(
        "Subject code must be between 2 and 20 characters"
      );
    }

    const codeRegex = /^[A-Z0-9]+$/;
    if (!codeRegex.test(code)) {
      throw new ValidationError(
        "Subject code must contain only uppercase letters and numbers"
      );
    }
  }

  // ==================== BUSINESS RULES ====================

  /**
   * Check if subject name is unique
   */
  private async ensureUniqueName(
    name: string,
    excludeSubjectId?: string
  ): Promise<void> {
    const existing = await subjectRepository.findByName(name);

    if (existing && existing.id !== excludeSubjectId) {
      throw new ValidationError(`A subject with name "${name}" already exists`);
    }
  }

  /**
   * Check if subject code is unique
   */
  private async ensureUniqueCode(
    code: string,
    excludeSubjectId?: string
  ): Promise<void> {
    const existing = await subjectRepository.findByCode(code);

    if (existing && existing.id !== excludeSubjectId) {
      throw new ValidationError(`A subject with code "${code}" already exists`);
    }
  }

  /**
   * Validate department change (Approach C: Strict blocking)
   *
   * Prevents changing a subject's department if the subject is actively in use.
   * This ensures data integrity and prevents inconsistencies in reports and analytics.
   *
   * @param subjectId - The ID of the subject being updated
   * @param oldDeptId - Current department ID (can be null)
   * @param newDeptId - New department ID (can be null/undefined)
   * @throws ValidationError if subject is in use and department is changing
   */
  private async validateDepartmentChange(
    subjectId: string,
    oldDeptId: string | null,
    newDeptId: string | null | undefined
  ): Promise<void> {
    // Import prisma directly for usage check
    const prisma = (await import("@/lib/db/prisma")).default;

    // Check if subject has active usage
    const usage = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        _count: {
          select: {
            teacherSubjects: true,
            subjectTeacherAssignments: true,
            assessments: true,
            reportCardSubjects: true,
          },
        },
      },
    });

    if (!usage) return; // Subject not found, will be handled elsewhere

    const { _count } = usage;
    const issues: string[] = [];

    // Check each type of usage
    if (_count.teacherSubjects > 0) {
      issues.push(
        `${_count.teacherSubjects} teacher${
          _count.teacherSubjects > 1 ? "s are" : " is"
        } assigned to this subject`
      );
    }

    if (_count.subjectTeacherAssignments > 0) {
      issues.push(
        `Subject is being taught in ${_count.subjectTeacherAssignments} class${
          _count.subjectTeacherAssignments > 1 ? "es" : ""
        }`
      );
    }

    if (_count.assessments > 0) {
      issues.push(
        `${_count.assessments} assessment${
          _count.assessments > 1 ? "s" : ""
        } recorded for this subject`
      );
    }

    if (_count.reportCardSubjects > 0) {
      issues.push(
        `${_count.reportCardSubjects} student grade${
          _count.reportCardSubjects > 1 ? "s" : ""
        } recorded for this subject`
      );
    }

    // If there are any issues, block the department change
    if (issues.length > 0) {
      const changeSummary =
        oldDeptId && newDeptId
          ? "changing departments"
          : oldDeptId && !newDeptId
          ? "removing the department assignment"
          : "assigning to a department";

      throw new ValidationError(
        `Cannot modify department while subject is in use. This subject has:\n\n` +
          issues.map((issue) => `• ${issue}`).join("\n") +
          `\n\nTo ${changeSummary}, you must first:\n` +
          `1. Unassign all teachers from this subject\n` +
          `2. Remove the subject from all class timetables\n` +
          `3. Archive or remove assessment records\n\n` +
          `Note: Historical grade data prevents department changes to maintain data integrity.`
      );
    }
  }

  // ==================== SERVICE METHODS ====================

  /**
   * Get all subjects (no pagination)
   * Useful for dropdowns, configs, analytics, etc.
   */
  async getAllSubjects(
    filters?: SubjectFilters,
    context?: ServiceContext
  ): Promise<Subject[]> {
    // Build where clause (same logic as getSubjects)
    const where: Prisma.SubjectWhereInput = {};

    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return await subjectRepository.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }

  /**
   * Get all subjects with optional filters and pagination
   */
  async getSubjects(
    filters?: SubjectFilters,
    pagination?: PaginationParams,
    context?: ServiceContext
  ): Promise<{
    data: Subject[];
    meta: { total: number; page: number; pageSize: number; totalPages: number };
  }> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;

    // Build where clause
    const where: Prisma.SubjectWhereInput = {};

    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await subjectRepository.count(where);

    // Get paginated data
    const data = await subjectRepository.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
    });

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get a single subject by ID
   */
  async getSubjectById(id: string, context: ServiceContext) {
    const subject = await subjectRepository.findById(id);

    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    return subject;
  }

  /**
   * Get a single subject by ID with all relations
   */
  async getSubjectByIdWithRelations(id: string, context: ServiceContext) {
    const subject = await subjectRepository.findByIdWithRelations(id);

    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    return subject;
  }

  /**
   * Get subject by code
   */
  async getSubjectByCode(code: string, context: ServiceContext) {
    return await subjectRepository.findByCode(code);
  }

  /**
   * Create a new subject
   */
  async createSubject(input: CreateSubjectInput, context: ServiceContext) {
    // Authorization check
    if (!this.canCreate(context)) {
      throw new UnauthorizedError(
        "You do not have permission to create subjects"
      );
    }

    // Validate inputs
    this.validateSubjectName(input.name);
    this.validateSubjectCode(input.code);

    // Ensure unique name and code
    await this.ensureUniqueName(input.name);
    await this.ensureUniqueCode(input.code);

    // Build create data
    const createData: Prisma.SubjectCreateInput = {
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
    };

    // Connect department if provided
    if (input.departmentId) {
      createData.department = {
        connect: { id: input.departmentId },
      };
    }

    // Create subject
    const subject = await subjectRepository.create(createData);

    return subject;
  }

  /**
   * Update a subject
   */
  async updateSubject(
    id: string,
    input: UpdateSubjectInput,
    context: ServiceContext
  ) {
    // Authorization check
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError(
        "You do not have permission to update subjects"
      );
    }

    // Find existing subject
    const existing = await subjectRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Subject not found");
    }

    // Validate inputs
    if (input.name !== undefined) {
      this.validateSubjectName(input.name);
      await this.ensureUniqueName(input.name, id);
    }

    if (input.code !== undefined) {
      this.validateSubjectCode(input.code);
      await this.ensureUniqueCode(input.code, id);
    }

    // Strict validation for department changes (only if APPROACH_C_STRICT is enabled)
    // If APPROACH_B_WARNING is enabled, frontend will handle the warning dialog
    if (
      SUBJECT_VALIDATION_MODE === "APPROACH_C_STRICT" &&
      input.departmentId !== undefined &&
      input.departmentId !== existing.departmentId
    ) {
      await this.validateDepartmentChange(
        id,
        existing.departmentId,
        input.departmentId
      );
    }

    // Update subject
    const updateData: Prisma.SubjectUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.code !== undefined) updateData.code = input.code.toUpperCase();
    if (input.description !== undefined)
      updateData.description = input.description;

    // Handle department update
    if (input.departmentId !== undefined) {
      if (input.departmentId === null) {
        updateData.department = { disconnect: true };
      } else {
        updateData.department = { connect: { id: input.departmentId } };
      }
    }

    return await subjectRepository.update(id, updateData);
  }

  /**
   * Delete a subject (hard delete - ADMIN only)
   */
  async deleteSubject(id: string, context: ServiceContext) {
    // Authorization check
    if (!this.canDelete(context)) {
      throw new UnauthorizedError(
        "You do not have permission to delete subjects"
      );
    }

    // Find existing subject
    const existing = await subjectRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Subject not found");
    }

    // Business rule: Cannot delete subject with teachers or grades assigned
    const teacherCount = await subjectRepository.getTeacherCount(id);
    const gradeCount = await subjectRepository.getGradeCount(id);

    if (teacherCount > 0 || gradeCount > 0) {
      throw new ValidationError(
        "Cannot delete a subject with teachers or grades assigned. Remove assignments first."
      );
    }

    return await subjectRepository.delete(id);
  }

  /**
   * Get subject statistics
   */
  async getSubjectStatistics(id: string, context: ServiceContext) {
    const subject = await this.getSubjectById(id, context);

    const teacherCount = await subjectRepository.getTeacherCount(id);
    const gradeCount = await subjectRepository.getGradeCount(id);

    return {
      subject,
      statistics: {
        teacherCount,
        gradeCount,
      },
    };
  }

  /**
   * Check whether a subject is actively used anywhere in the system
   * (teachers, class assignments, assessments, report cards, timetables).
   * Used to warn admins before changing critical subject properties like department.
   */
  async getUsage(id: string, context: ServiceContext) {
    await this.getSubjectById(id, context);

    const subject = await subjectRepository.findByIdWithUsageRelations(id);
    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    const teacherCount = subject.teacherSubjects.length;
    const classCount = subject.subjectTeacherAssignments.length;
    const assessmentCount = subject.assessments.length;
    const gradeCount = subject.reportCardSubjects.length;
    const timetableSlotCount = subject.classTimetables.length + subject.secondaryTimetables.length;

    return {
      isInUse: teacherCount > 0 || classCount > 0 || assessmentCount > 0 || gradeCount > 0 || timetableSlotCount > 0,
      hasTeachers: teacherCount > 0,
      teacherCount,
      hasClasses: classCount > 0,
      classCount,
      hasAssessments: assessmentCount > 0,
      assessmentCount,
      hasGrades: gradeCount > 0,
      gradeCount,
      hasTimetableSlots: timetableSlotCount > 0,
      timetableSlotCount,
      subject: {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        departmentId: subject.departmentId,
      },
    };
  }

  /**
   * Assign subject to grade
   */
  async assignToGrade(
    subjectId: string,
    gradeId: string,
    isCore: boolean,
    context: ServiceContext
  ) {
    // Authorization check
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError(
        "You do not have permission to assign subjects to grades"
      );
    }

    // Verify subject exists
    const subject = await subjectRepository.findById(subjectId);
    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    return await subjectRepository.assignToGrade(subjectId, gradeId, isCore);
  }

  /**
   * Remove subject from grade
   */
  async removeFromGrade(
    subjectId: string,
    gradeId: string,
    context: ServiceContext
  ) {
    // Authorization check
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError(
        "You do not have permission to remove subjects from grades"
      );
    }

    return await subjectRepository.removeFromGrade(subjectId, gradeId);
  }

  /**
   * Bulk import subjects from CSV data
   */
  async bulkImportSubjects(
    rows: Array<{ name: string; code: string; description?: string }>,
    context: ServiceContext
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ row: number; name?: string; error: string }>;
  }> {
    if (!this.canCreate(context)) {
      throw new UnauthorizedError("Insufficient permissions to import subjects");
    }

    if (rows.length === 0) {
      throw new ValidationError("No rows to import");
    }
    if (rows.length > 200) {
      throw new ValidationError("Maximum 200 subjects per import");
    }

    let successful = 0;
    let failed = 0;
    const errors: Array<{ row: number; name?: string; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        if (!row.name?.trim()) {
          errors.push({ row: rowNum, error: "name is required" });
          failed++;
          continue;
        }
        if (!row.code?.trim()) {
          errors.push({ row: rowNum, name: row.name, error: "code is required" });
          failed++;
          continue;
        }

        const name = row.name.trim();
        const code = row.code.trim().toUpperCase();

        const [nameExists, codeExists] = await Promise.all([
          subjectRepository.existsByName(name),
          subjectRepository.existsByCode(code),
        ]);
        if (nameExists || codeExists) {
          const conflict = nameExists ? `name "${name}"` : `code "${code}"`;
          errors.push({ row: rowNum, name, error: `Already exists: ${conflict}` });
          failed++;
          continue;
        }

        await subjectRepository.create({
          name,
          code,
          description: row.description?.trim() || null,
        });
        successful++;
      } catch (err) {
        errors.push({
          row: rowNum,
          name: row.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
        failed++;
      }
    }

    return { successful, failed, errors };
  }
}

export const subjectService = new SubjectService();
