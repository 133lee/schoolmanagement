import { Prisma } from "@prisma/client";
import { Department, DepartmentStatus } from "@/types/prisma-enums";
import { departmentRepository } from "./department.repository";
import { UnauthorizedError, NotFoundError, ValidationError } from "@/lib/errors";

/**
 * Department Service - Business Logic Layer
 *
 * Handles business rules, validation, and authorization for department operations.
 * Uses DepartmentRepository for data access.
 */

// Service context for authorization
// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
}

// Input DTOs
export interface CreateDepartmentInput {
  name: string;
  code: string;
  description?: string;
  status?: DepartmentStatus;
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  description?: string;
  status?: DepartmentStatus;
  hodTeacherId?: string | null;
}

export interface DepartmentFilters {
  status?: DepartmentStatus;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export class DepartmentService {
  // ==================== PERMISSION CHECKS ====================

  /**
   * Check if user can create departments
   * Only ADMIN and HEAD_TEACHER can create departments
   */
  private canCreate(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  /**
   * Check if user can update departments
   * Only ADMIN and HEAD_TEACHER can update departments
   */
  private canUpdate(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  /**
   * Check if user can delete departments
   * Only ADMIN can delete departments
   */
  private canDelete(context: ServiceContext): boolean {
    return context.role === "ADMIN";
  }

  // ==================== VALIDATION ====================

  /**
   * Validate department name format
   * Department names should be alphanumeric and max 100 characters
   */
  private validateDepartmentName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError("Department name is required");
    }

    if (name.length > 100) {
      throw new ValidationError(
        "Department name must not exceed 100 characters"
      );
    }

    const nameRegex = /^[a-zA-Z0-9\s\-&]+$/;
    if (!nameRegex.test(name)) {
      throw new ValidationError(
        "Department name must contain only letters, numbers, spaces, hyphens, and ampersands"
      );
    }
  }

  /**
   * Validate department code format
   * Codes should be uppercase alphanumeric, 2-10 characters
   */
  private validateDepartmentCode(code: string): void {
    if (!code || code.trim().length === 0) {
      throw new ValidationError("Department code is required");
    }

    if (code.length < 2 || code.length > 10) {
      throw new ValidationError(
        "Department code must be between 2 and 10 characters"
      );
    }

    const codeRegex = /^[A-Z0-9]+$/;
    if (!codeRegex.test(code)) {
      throw new ValidationError(
        "Department code must contain only uppercase letters and numbers"
      );
    }
  }

  // ==================== BUSINESS RULES ====================

  /**
   * Check if department name is unique
   */
  private async ensureUniqueName(
    name: string,
    excludeDepartmentId?: string
  ): Promise<void> {
    const existing = await departmentRepository.findByName(name);

    if (existing && existing.id !== excludeDepartmentId) {
      throw new ValidationError(
        `A department with name "${name}" already exists`
      );
    }
  }

  /**
   * Check if department code is unique
   */
  private async ensureUniqueCode(
    code: string,
    excludeDepartmentId?: string
  ): Promise<void> {
    const existing = await departmentRepository.findByCode(code);

    if (existing && existing.id !== excludeDepartmentId) {
      throw new ValidationError(
        `A department with code "${code}" already exists`
      );
    }
  }

  /**
   * Business Rule: ARCHIVED departments cannot be modified
   */
  private ensureNotArchived(department: Department): void {
    if (department.status === DepartmentStatus.ARCHIVED) {
      throw new ValidationError("Cannot modify an archived department");
    }
  }

  // ==================== SERVICE METHODS ====================

  /**
   * Get all departments with optional filters and pagination
   */
  async getDepartments(
    filters?: DepartmentFilters,
    pagination?: PaginationParams,
    context?: ServiceContext
  ): Promise<{
    data: Department[];
    meta: { total: number; page: number; pageSize: number; totalPages: number };
  }> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;

    // Build where clause
    const where: Prisma.DepartmentWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await departmentRepository.count(where);

    // Get paginated data with counts
    const rawData = await departmentRepository.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
    });

    // Transform data to include flat count fields and HOD info
    const data = rawData.map((dept: any) => ({
      ...dept,
      teacherCount: dept._count?.teachers || 0,
      subjectCount: dept._count?.subjects || 0,
      // Transform hodTeacher to match the expected format
      hod: dept.hodTeacher ? {
        id: dept.hodTeacher.id,
        firstName: dept.hodTeacher.firstName,
        lastName: dept.hodTeacher.lastName,
        email: dept.hodTeacher.user?.email || '',
      } : null,
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
   * Get a single department by ID
   */
  async getDepartmentById(id: string, context: ServiceContext) {
    const department = await departmentRepository.findById(id);

    if (!department) {
      throw new NotFoundError("Department not found");
    }

    return department;
  }

  /**
   * Get a single department by ID with all relations
   */
  async getDepartmentByIdWithRelations(id: string, context: ServiceContext) {
    const department = await departmentRepository.findByIdWithRelations(id);

    if (!department) {
      throw new NotFoundError("Department not found");
    }

    return department;
  }

  /**
   * Get department by code
   */
  async getDepartmentByCode(code: string, context: ServiceContext) {
    return await departmentRepository.findByCode(code);
  }

  /**
   * Create a new department
   */
  async createDepartment(input: CreateDepartmentInput, context: ServiceContext) {
    // Authorization check
    if (!this.canCreate(context)) {
      throw new UnauthorizedError(
        "You do not have permission to create departments"
      );
    }

    // Validate inputs
    this.validateDepartmentName(input.name);
    this.validateDepartmentCode(input.code);

    // Ensure unique name and code
    await this.ensureUniqueName(input.name);
    await this.ensureUniqueCode(input.code);

    // Create department
    const department = await departmentRepository.create({
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      status: input.status || DepartmentStatus.ACTIVE,
    });

    return department;
  }

  /**
   * Update a department
   */
  async updateDepartment(
    id: string,
    input: UpdateDepartmentInput,
    context: ServiceContext
  ) {
    // Authorization check
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError(
        "You do not have permission to update departments"
      );
    }

    // Find existing department
    const existing = await departmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Department not found");
    }

    // Business rule: Cannot modify archived departments
    this.ensureNotArchived(existing);

    // Validate inputs
    if (input.name !== undefined) {
      this.validateDepartmentName(input.name);
      await this.ensureUniqueName(input.name, id);
    }

    if (input.code !== undefined) {
      this.validateDepartmentCode(input.code);
      await this.ensureUniqueCode(input.code, id);
    }

    // Validate HOD assignment - ensure teacher exists
    if (input.hodTeacherId !== undefined && input.hodTeacherId) {
      const teacher = await departmentRepository.findTeacherById(input.hodTeacherId);
      if (!teacher) {
        throw new ValidationError(
          "Invalid HOD: teacher profile does not exist"
        );
      }
      if (teacher.status !== "ACTIVE") {
        throw new ValidationError(
          "Cannot assign inactive teacher as HOD"
        );
      }
    }

    // Update department
    const updateData: Prisma.DepartmentUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.code !== undefined) updateData.code = input.code.toUpperCase();
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;

    // Handle HOD assignment - connect to TeacherProfile if provided, disconnect if null/undefined
    if (input.hodTeacherId !== undefined) {
      if (input.hodTeacherId) {
        updateData.hodTeacher = {
          connect: { id: input.hodTeacherId },
        };
      } else {
        updateData.hodTeacher = {
          disconnect: true,
        };
      }
    }

    // A newly-assigned HOD must also become a department member — otherwise
    // they'd hold the position without appearing in the department's own
    // teacher roster. Both writes must succeed together.
    if (input.hodTeacherId) {
      const newHodId = input.hodTeacherId;
      return departmentRepository.withTransaction(async (tx) => {
        const updated = await departmentRepository.update(id, updateData, tx);
        await departmentRepository.addMembers(id, [newHodId], tx);
        return updated;
      });
    }

    return await departmentRepository.update(id, updateData);
  }

  /**
   * Change department status
   */
  async changeDepartmentStatus(
    id: string,
    newStatus: DepartmentStatus,
    context: ServiceContext
  ) {
    // Authorization check
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError(
        "You do not have permission to update department status"
      );
    }

    // Find existing department
    const existing = await departmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Department not found");
    }

    // Business rule: Cannot change status of archived department
    if (
      existing.status === DepartmentStatus.ARCHIVED &&
      newStatus !== DepartmentStatus.ARCHIVED
    ) {
      throw new ValidationError("Cannot reactivate an archived department");
    }

    // Business rule: Cannot archive a department with active subjects or teachers
    if (newStatus === DepartmentStatus.ARCHIVED) {
      const subjectCount = await departmentRepository.getSubjectCount(id);
      const teacherCount = await departmentRepository.getTeacherCount(id);

      if (subjectCount > 0 || teacherCount > 0) {
        throw new ValidationError(
          "Cannot archive a department with active subjects or teachers. Reassign them first."
        );
      }
    }

    return await departmentRepository.update(id, { status: newStatus });
  }

  /**
   * Delete a department (hard delete - ADMIN only)
   */
  async deleteDepartment(id: string, context: ServiceContext) {
    // Authorization check
    if (!this.canDelete(context)) {
      throw new UnauthorizedError(
        "You do not have permission to delete departments"
      );
    }

    // Find existing department
    const existing = await departmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError("Department not found");
    }

    // Business rule: Cannot delete department with subjects or teachers
    const subjectCount = await departmentRepository.getSubjectCount(id);
    const teacherCount = await departmentRepository.getTeacherCount(id);

    if (subjectCount > 0 || teacherCount > 0) {
      throw new ValidationError(
        "Cannot delete a department with subjects or teachers. Archive it instead."
      );
    }

    return await departmentRepository.delete(id);
  }

  /**
   * Get department statistics
   */
  async getDepartmentStatistics(id: string, context: ServiceContext) {
    const department = await this.getDepartmentById(id, context);

    const subjectCount = await departmentRepository.getSubjectCount(id);
    const teacherCount = await departmentRepository.getTeacherCount(id);

    return {
      department,
      statistics: {
        subjectCount,
        teacherCount,
      },
    };
  }

  /**
   * Add one or more teachers to a department. Restricted to ADMIN, matching
   * the sensitivity of directly editing staff department membership.
   */
  async addMembers(departmentId: string, teacherIds: string[], context: ServiceContext) {
    if (context.role !== "ADMIN") {
      throw new UnauthorizedError("Only administrators can manage department members");
    }

    if (!Array.isArray(teacherIds) || teacherIds.length === 0) {
      throw new ValidationError("teacherIds must be a non-empty array");
    }

    const department = await departmentRepository.findById(departmentId);
    if (!department) {
      throw new NotFoundError("Department not found");
    }

    const teachers = await departmentRepository.findTeachersByIds(teacherIds);
    if (teachers.length !== teacherIds.length) {
      throw new ValidationError("One or more teacher IDs are invalid");
    }

    const assignments = await departmentRepository.addMembers(departmentId, teacherIds);

    return {
      message: `${teacherIds.length} teacher(s) added to department`,
      assignments,
    };
  }

  /**
   * Remove a teacher from a department. Restricted to ADMIN.
   */
  async removeMember(departmentId: string, teacherId: string, context: ServiceContext) {
    if (context.role !== "ADMIN") {
      throw new UnauthorizedError("Only administrators can manage department members");
    }

    if (!teacherId || typeof teacherId !== "string") {
      throw new ValidationError("teacherId is required");
    }

    const removedCount = await departmentRepository.removeMember(departmentId, teacherId);
    if (removedCount === 0) {
      throw new NotFoundError("Teacher not found in this department");
    }

    return { message: "Teacher removed from department" };
  }
}

export const departmentService = new DepartmentService();
