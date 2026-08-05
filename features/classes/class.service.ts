import { Prisma } from "@prisma/client";
import { Class, ClassStatus } from "@/types/prisma-enums";
import { classRepository } from "./class.repository";
import { gradeRepository } from "@/features/grade-levels/grade.repository";
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { isHOD } from "@/lib/auth/position-helpers";

export interface ClassImportRow {
  name: string;
  gradeName: string;
  capacity?: string;
}

export interface BulkImportResult {
  successful: number;
  failed: number;
  errors: Array<{ row: number; name?: string; error: string }>;
}

/**
 * Class Service - Business Logic Layer
 *
 * Handles business rules, validation, and authorization for class operations.
 * Uses ClassRepository for data access.
 */

// Service context for authorization
// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
// Use isHOD(userId) from position-helpers for HOD checks
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
}

// Input DTOs
export interface CreateClassInput {
  gradeId: string;
  name: string;
  capacity?: number;
  status?: ClassStatus;
}

export interface UpdateClassInput {
  name?: string;
  capacity?: number;
  status?: ClassStatus;
}

export interface ClassFilters {
  status?: ClassStatus;
  gradeId?: string;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export class ClassService {
  // ==================== PERMISSION CHECKS ====================

  /**
   * Check if user can create classes
   * Only ADMIN and HEAD_TEACHER can create classes
   */
  private canCreate(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  /**
   * Check if user can update classes
   * Only ADMIN and HEAD_TEACHER can update classes
   */
  private canUpdate(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  /**
   * Check if user can assign or remove class teachers
   * ADMIN, HEAD_TEACHER, DEPUTY_HEAD can always assign
   * TEACHER can assign if they are HOD (position-based check)
   */
  private async canAssignClassTeacher(context: ServiceContext): Promise<boolean> {
    if (["ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD"].includes(context.role)) {
      return true;
    }

    // Teachers: check if they hold HOD position
    if (context.role === "TEACHER") {
      return await isHOD(context.userId);
    }

    return false;
  }

  /**
   * Check if user can delete classes
   * Only ADMIN can delete classes
   */
  private canDelete(context: ServiceContext): boolean {
    return context.role === "ADMIN";
  }

  // ==================== VALIDATION ====================

  /**
   * Validate class name format
   * Class names should be alphanumeric and max 50 characters
   */
  private validateClassName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError("Class name is required");
    }

    if (name.length > 50) {
      throw new ValidationError("Class name must not exceed 50 characters");
    }

    const nameRegex = /^[a-zA-Z0-9\s\-]+$/;
    if (!nameRegex.test(name)) {
      throw new ValidationError(
        "Class name must contain only letters, numbers, spaces, and hyphens"
      );
    }
  }

  /**
   * Validate class capacity
   * Capacity should be between 10 and 100 students
   */
  private validateCapacity(capacity: number): void {
    if (capacity < 10 || capacity > 100) {
      throw new ValidationError(
        "Class capacity must be between 10 and 100 students"
      );
    }
  }

  /**
   * Validate that current enrollment doesn't exceed capacity
   */
  private validateEnrollmentCapacity(
    currentEnrolled: number,
    capacity: number
  ): void {
    if (currentEnrolled > capacity) {
      throw new ValidationError(
        `Current enrollment (${currentEnrolled}) exceeds class capacity (${capacity})`
      );
    }
  }

  // ==================== BUSINESS RULES ====================

  /**
   * Check if class name is unique within a grade
   */
  private async ensureUniqueClassName(
    gradeId: string,
    name: string,
    excludeClassId?: string
  ): Promise<void> {
    const existing = await classRepository.findByGradeAndName(gradeId, name);

    if (existing && existing.id !== excludeClassId) {
      throw new ValidationError(
        `A class with name "${name}" already exists in this grade`
      );
    }
  }

  /**
   * Business Rule: ARCHIVED classes cannot be modified
   */
  private ensureNotArchived(classEntity: Class): void {
    if (classEntity.status === ClassStatus.ARCHIVED) {
      throw new ValidationError("Cannot modify an archived class");
    }
  }

  // ==================== SERVICE METHODS ====================

  /**
   * Get all classes without pagination (for dropdowns/selectors)
   */
  async getAllClasses(
    filters?: ClassFilters,
    context?: ServiceContext
  ): Promise<Class[]> {
    // Build where clause (same logic as getClasses)
    const where: Prisma.ClassWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.gradeId) {
      where.gradeId = filters.gradeId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { grade: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    return await (classRepository.findMany as any)({
      where,
      include: {
        grade: true,
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: [
        { grade: { sequence: "asc" } },
        { name: "asc" },
      ],
    });
  }

  /**
   * Get all classes with optional filters and pagination
   */
  async getClasses(
    filters?: ClassFilters,
    pagination?: PaginationParams,
    context?: ServiceContext
  ): Promise<{
    data: Class[];
    meta: { total: number; page: number; pageSize: number; totalPages: number };
  }> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;

    // Build where clause
    const where: Prisma.ClassWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.gradeId) {
      where.gradeId = filters.gradeId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { grade: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    // Get total count
    const total = await classRepository.count(where);

    // Get paginated data
    const rawData = await classRepository.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
    });

    // Transform data to include currentEnrolled from _count
    const data = rawData.map((classItem: any) => ({
      ...classItem,
      currentEnrolled: classItem._count?.enrollments || 0,
    }));

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
   * Get a single class by ID
   */
  async getClassById(id: string, context: ServiceContext) {
    const classEntity = await classRepository.findById(id);

    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    return classEntity;
  }

  /**
   * Get a single class by ID with all relations
   */
  async getClassByIdWithRelations(id: string, context: ServiceContext) {
    const classEntity = await classRepository.findByIdWithRelations(id);

    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    return classEntity;
  }

  /**
   * Get class by grade and name
   */
  async getClassByGradeAndName(
    gradeId: string,
    name: string,
    context: ServiceContext
  ) {
    return await classRepository.findByGradeAndName(gradeId, name);
  }

  /**
   * Create a new class
   */
  async createClass(input: CreateClassInput, context: ServiceContext) {
    // Authorization check
    if (!this.canCreate(context)) {
      throw new UnauthorizedError(
        "You do not have permission to create classes"
      );
    }

    // Validate inputs
    this.validateClassName(input.name);

    const capacity = input.capacity || 40;
    this.validateCapacity(capacity);

    // Ensure unique class name within grade
    await this.ensureUniqueClassName(input.gradeId, input.name);

    // Create class
    const classEntity = await classRepository.create({
      name: input.name,
      capacity,
      status: input.status || ClassStatus.ACTIVE,
      grade: {
        connect: { id: input.gradeId },
      },
    });

    return classEntity;
  }

  /**
   * Update a class
   */
  async updateClass(
    id: string,
    input: UpdateClassInput,
    context: ServiceContext
  ) {
    // Authorization check
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError(
        "You do not have permission to update classes"
      );
    }

    // Find existing class
    const existing = await classRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Class not found");
    }

    // Business rule: Cannot modify archived classes
    this.ensureNotArchived(existing);

    // Validate inputs
    if (input.name !== undefined) {
      this.validateClassName(input.name);
      // Ensure unique class name within grade (excluding current class)
      await this.ensureUniqueClassName(existing.gradeId, input.name, id);
    }

    if (input.capacity !== undefined) {
      this.validateCapacity(input.capacity);
      // Ensure current enrollment doesn't exceed new capacity
      const enrollmentCount = await classRepository.getCurrentEnrollmentCount(
        id
      );
      this.validateEnrollmentCapacity(enrollmentCount, input.capacity);
    }

    // Update class
    const updateData: Prisma.ClassUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    if (input.status !== undefined) updateData.status = input.status;

    return await classRepository.update(id, updateData);
  }

  /**
   * Change class status
   */
  async changeClassStatus(
    id: string,
    newStatus: ClassStatus,
    context: ServiceContext
  ) {
    // Authorization check
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError(
        "You do not have permission to update class status"
      );
    }

    // Find existing class
    const existing = await classRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Class not found");
    }

    // Business rule: Cannot change status of archived class
    if (
      existing.status === ClassStatus.ARCHIVED &&
      newStatus !== ClassStatus.ARCHIVED
    ) {
      throw new ValidationError("Cannot reactivate an archived class");
    }

    // Business rule: Cannot archive a class with active enrollments
    const enrollmentCount = await classRepository.getEnrollmentCount(id);
    if (newStatus === ClassStatus.ARCHIVED && enrollmentCount > 0) {
      throw new ValidationError(
        "Cannot archive a class with active students. Transfer students first."
      );
    }

    return await classRepository.update(id, { status: newStatus });
  }

  /**
   * Delete a class (hard delete - ADMIN only)
   */
  async deleteClass(id: string, context: ServiceContext) {
    // Authorization check
    if (!this.canDelete(context)) {
      throw new UnauthorizedError(
        "You do not have permission to delete classes"
      );
    }

    // Find existing class
    const existing = await classRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Class not found");
    }

    // Business rule: Cannot delete class with enrollments
    const enrollmentCount = await classRepository.getEnrollmentCount(id);
    if (enrollmentCount > 0) {
      throw new ValidationError(
        "Cannot delete a class with enrolled students. Archive it instead."
      );
    }

    return await classRepository.delete(id);
  }

  /**
   * Sync enrollment count for a class
   */
  async syncEnrollmentCount(id: string, context: ServiceContext) {
    // Authorization check
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError(
        "You do not have permission to sync enrollment"
      );
    }

    return await (classRepository as any).getEnrollmentCount(id);
  }

  // ==================== CLASS TEACHER MANAGEMENT ====================

  /**
   * Helper: Check if grade is primary (Grades 1-7)
   */
  private isPrimaryGrade(schoolLevel: string): boolean {
    return schoolLevel === "PRIMARY";
  }

  /**
   * Helper: Get active academic year
   */
  private async getActiveAcademicYear() {
    const activeYear = await classRepository.getActiveAcademicYear();
    if (!activeYear) {
      throw new ValidationError("No active academic year found");
    }
    return activeYear;
  }

  /**
   * Assign or reassign class teacher
   * For primary grades (1-7), also assigns teacher to all subjects
   */
  async assignClassTeacher(
    classId: string,
    teacherId: string,
    context: ServiceContext
  ) {
    // Authorization check (async - checks HOD position for teachers)
    if (!(await this.canAssignClassTeacher(context))) {
      throw new UnauthorizedError(
        "You do not have permission to assign class teachers"
      );
    }

    // Get active academic year
    const academicYear = await this.getActiveAcademicYear();

    // Find the class with grade information
    const classEntity = await classRepository.findById(classId);
    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    // Validate: Cannot assign to archived class
    this.ensureNotArchived(classEntity);

    // Check if teacher already assigned to another class in this academic year
    const existingAssignment = await classRepository.findClassTeacherAssignment(
      teacherId,
      academicYear.id
    );

    if (existingAssignment && existingAssignment.classId !== classId) {
      throw new ValidationError(
        "This teacher is already assigned as class teacher to another class in this academic year"
      );
    }

    // Remove existing class teacher assignment if any (for this academic year)
    await classRepository.removeClassTeacher(classId, academicYear.id);

    // Assign new class teacher
    await classRepository.assignClassTeacher(
      classId,
      teacherId,
      academicYear.id
    );

    // PRIMARY GRADE RULE: Auto-assign to all subjects
    if (this.isPrimaryGrade((classEntity as any).grade?.schoolLevel)) {
      await classRepository.assignTeacherToAllSubjects(
        classId,
        teacherId,
        academicYear.id
      );
    }

    return { success: true };
  }

  /**
   * Remove class teacher assignment
   */
  async removeClassTeacher(classId: string, context: ServiceContext) {
    // Authorization check (async - checks HOD position for teachers)
    if (!(await this.canAssignClassTeacher(context))) {
      throw new UnauthorizedError(
        "You do not have permission to remove class teachers"
      );
    }

    // Get active academic year
    const academicYear = await this.getActiveAcademicYear();

    // Find the class
    const classEntity = await classRepository.findById(classId);
    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    // Remove class teacher assignment
    await classRepository.removeClassTeacher(classId, academicYear.id);

    // PRIMARY GRADE RULE: Also remove subject assignments
    if (this.isPrimaryGrade((classEntity as any).grade?.schoolLevel)) {
      await classRepository.removeAllSubjectAssignments(
        classId,
        academicYear.id
      );
    }

    return { success: true };
  }

  /**
   * Bulk import classes from CSV data
   * gradeName must match an existing Grade name exactly (e.g. "Grade 8", "Form 1")
   */
  async bulkImportClasses(
    rows: ClassImportRow[],
    context: ServiceContext
  ): Promise<BulkImportResult> {
    if (!this.canCreate(context)) {
      throw new UnauthorizedError("Insufficient permissions to import classes");
    }

    if (rows.length === 0) {
      throw new ValidationError("No rows to import");
    }
    if (rows.length > 200) {
      throw new ValidationError("Maximum 200 classes per import");
    }

    // Pre-load all grades to avoid N+1 lookups
    const allGrades = await gradeRepository.findAll();
    const gradeByName = new Map(allGrades.map((g) => [g.name.toLowerCase(), g]));

    const result: BulkImportResult = { successful: 0, failed: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        if (!row.name?.trim()) {
          result.errors.push({ row: rowNum, error: "name is required" });
          result.failed++;
          continue;
        }
        if (!row.gradeName?.trim()) {
          result.errors.push({ row: rowNum, name: row.name, error: "gradeName is required" });
          result.failed++;
          continue;
        }

        const name = row.name.trim();
        const grade = gradeByName.get(row.gradeName.trim().toLowerCase());
        if (!grade) {
          result.errors.push({
            row: rowNum,
            name,
            error: `Grade "${row.gradeName}" not found`,
          });
          result.failed++;
          continue;
        }

        const capacity = row.capacity ? parseInt(row.capacity, 10) : 40;
        if (isNaN(capacity) || capacity < 1 || capacity > 200) {
          result.errors.push({
            row: rowNum,
            name,
            error: "capacity must be a number between 1 and 200",
          });
          result.failed++;
          continue;
        }

        const exists = await classRepository.existsByGradeAndName(grade.id, name);
        if (exists) {
          result.errors.push({
            row: rowNum,
            name,
            error: `Class "${name}" already exists in ${grade.name}`,
          });
          result.failed++;
          continue;
        }

        await classRepository.create({
          name,
          capacity,
          status: ClassStatus.ACTIVE,
          grade: { connect: { id: grade.id } },
        });
        result.successful++;
      } catch (err) {
        result.errors.push({
          row: rowNum,
          name: row.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
        result.failed++;
      }
    }

    return result;
  }
}

export const classService = new ClassService();
