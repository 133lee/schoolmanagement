import { Prisma } from "@prisma/client";
import { Guardian, ParentStatus, ParentRelationship } from "@/types/prisma-enums";
import { parentRepository } from "./parent.repository";
import { studentRepository } from "@/features/students/student.repository";
import { UnauthorizedError, NotFoundError, ValidationError } from "@/lib/errors";

export interface LinkStudentInput {
  studentId: string;
  relationship: ParentRelationship;
  isPrimary?: boolean;
}

/**
 * Parent Service - Business Logic Layer
 *
 * Handles business rules, validation, and authorization for guardian operations.
 * Uses ParentRepository for data access.
 */

// Service context for authorization
// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
}

// Input DTOs
export interface CreateParentInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  occupation?: string;
  status?: ParentStatus;
}

export interface UpdateParentInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
  status?: ParentStatus;
}

export interface ParentFilters {
  status?: ParentStatus;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export class ParentService {
  // ==================== PERMISSION CHECKS ====================

  /**
   * Check if user can create guardians
   * Only ADMIN, HEAD_TEACHER, and CLERK can create guardians
   */
  private canCreate(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER", "CLERK"].includes(context.role);
  }

  /**
   * Check if user can update guardians
   * Only ADMIN, HEAD_TEACHER, and CLERK can update guardians
   */
  private canUpdate(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER", "CLERK"].includes(context.role);
  }

  /**
   * Check if user can delete guardians
   * Only ADMIN can delete guardians
   */
  private canDelete(context: ServiceContext): boolean {
    return context.role === "ADMIN";
  }

  /**
   * Check if user can read guardians
   * All authenticated users can read guardians
   */
  private canRead(context: ServiceContext): boolean {
    return true; // All roles can read
  }

  // ==================== VALIDATION ====================

  /**
   * Validate phone number format (Zambian format)
   */
  private validatePhone(phone: string): void {
    // Zambian phone format: +260 followed by 9 digits
    // or just 09/07 followed by 8 digits
    const phoneRegex = /^(\+260|0)[79]\d{8}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
      throw new ValidationError(
        "Invalid phone number format. Use +260XXXXXXXXX or 09XXXXXXXX"
      );
    }
  }

  /**
   * Validate email format
   */
  private validateEmail(email?: string): void {
    if (!email) return; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError("Invalid email format");
    }
  }

  /**
   * Validate guardian name
   */
  private validateName(name: string, field: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError(`${field} is required`);
    }
    if (name.length > 100) {
      throw new ValidationError(`${field} must not exceed 100 characters`);
    }
    // Allow letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(name)) {
      throw new ValidationError(
        `${field} must contain only letters, spaces, hyphens, and apostrophes`
      );
    }
  }

  // ==================== BUSINESS LOGIC ====================

  /**
   * Create a new guardian
   */
  async createParent(input: CreateParentInput, context: ServiceContext): Promise<Guardian> {
    // Authorization check
    if (!this.canCreate(context)) {
      throw new UnauthorizedError(
        "You do not have permission to create guardians"
      );
    }

    // Validate input
    this.validateName(input.firstName, "First name");
    this.validateName(input.lastName, "Last name");
    this.validatePhone(input.phone);
    this.validateEmail(input.email);

    // Check for duplicate phone
    const existingByPhone = await parentRepository.findByPhone(input.phone);
    if (existingByPhone) {
      throw new ValidationError("A guardian with this phone number already exists");
    }

    // Check for duplicate email (if provided)
    if (input.email) {
      const existingByEmail = await parentRepository.findByEmail(input.email);
      if (existingByEmail) {
        throw new ValidationError("A guardian with this email already exists");
      }
    }

    // Create guardian
    return await parentRepository.create({
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      email: input.email,
      address: input.address,
      occupation: input.occupation,
      status: input.status || ParentStatus.ACTIVE,
    });
  }

  /**
   * Get guardian by ID
   */
  async getParentById(id: string, context: ServiceContext): Promise<Guardian> {
    // Authorization check
    if (!this.canRead(context)) {
      throw new UnauthorizedError("You do not have permission to read guardians");
    }

    const parent = await parentRepository.findById(id);
    if (!parent) {
      throw new NotFoundError(`Guardian with ID ${id} not found`);
    }

    return parent;
  }

  /**
   * Get guardian by ID with relations
   */
  async getParentByIdWithRelations(id: string, context: ServiceContext) {
    // Authorization check
    if (!this.canRead(context)) {
      throw new UnauthorizedError("You do not have permission to read guardians");
    }

    const parent = await parentRepository.findByIdWithRelations(id);
    if (!parent) {
      throw new NotFoundError(`Guardian with ID ${id} not found`);
    }

    return parent;
  }

  /**
   * Get all guardians with filters and pagination
   */
  async getParents(
    filters: ParentFilters,
    pagination: PaginationParams,
    context: ServiceContext
  ): Promise<{ data: Guardian[]; meta: any }> {
    // Authorization check
    if (!this.canRead(context)) {
      throw new UnauthorizedError("You do not have permission to read guardians");
    }

    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.GuardianWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const { data, total } = await parentRepository.findAll(skip, pageSize, where);

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
   * Update guardian
   */
  async updateParent(
    id: string,
    input: UpdateParentInput,
    context: ServiceContext
  ): Promise<Guardian> {
    // Authorization check
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError("You do not have permission to update guardians");
    }

    // Check if guardian exists
    const existing = await parentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Guardian with ID ${id} not found`);
    }

    // Validate input
    if (input.firstName) {
      this.validateName(input.firstName, "First name");
    }
    if (input.lastName) {
      this.validateName(input.lastName, "Last name");
    }
    if (input.phone) {
      this.validatePhone(input.phone);

      // Check for duplicate phone (excluding current guardian)
      const existingByPhone = await parentRepository.findByPhone(input.phone);
      if (existingByPhone && existingByPhone.id !== id) {
        throw new ValidationError("A guardian with this phone number already exists");
      }
    }
    if (input.email) {
      this.validateEmail(input.email);

      // Check for duplicate email (excluding current guardian)
      const existingByEmail = await parentRepository.findByEmail(input.email);
      if (existingByEmail && existingByEmail.id !== id) {
        throw new ValidationError("A guardian with this email already exists");
      }
    }

    // Business rule: Cannot change status from DECEASED
    if (existing.status === ParentStatus.DECEASED && input.status && input.status !== ParentStatus.DECEASED) {
      throw new ValidationError("Cannot change status of deceased guardian");
    }

    return await parentRepository.update(id, input);
  }

  /**
   * Delete guardian
   */
  async deleteParent(id: string, context: ServiceContext): Promise<Guardian> {
    // Authorization check
    if (!this.canDelete(context)) {
      throw new UnauthorizedError("You do not have permission to delete guardians");
    }

    // Check if guardian exists
    const existing = await parentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Guardian with ID ${id} not found`);
    }

    // Business rule: Cannot delete guardian with active students
    const studentCount = await parentRepository.getStudentCount(id);
    if (studentCount > 0) {
      throw new ValidationError(
        `Cannot delete guardian with ${studentCount} associated student(s). Remove student relationships first.`
      );
    }

    return await parentRepository.delete(id);
  }

  /**
   * Get guardian's students
   */
  async getParentStudents(id: string, context: ServiceContext) {
    // Authorization check
    if (!this.canRead(context)) {
      throw new UnauthorizedError("You do not have permission to read guardians");
    }

    // Check if guardian exists
    const existing = await parentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Guardian with ID ${id} not found`);
    }

    return await parentRepository.getStudents(id);
  }

  /**
   * Link a student to a guardian
   */
  async linkStudent(guardianId: string, input: LinkStudentInput, context: ServiceContext) {
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError("You do not have permission to link students to guardians");
    }

    if (!input.studentId || !input.relationship) {
      throw new ValidationError("Student ID and relationship are required");
    }

    const guardian = await parentRepository.findById(guardianId);
    if (!guardian) {
      throw new NotFoundError("Guardian not found");
    }

    const student = await studentRepository.findById(input.studentId);
    if (!student) {
      throw new NotFoundError("Student not found");
    }

    const existingLink = await parentRepository.findStudentGuardianLink(
      input.studentId,
      guardianId
    );
    if (existingLink) {
      throw new ValidationError("Student is already linked to this guardian");
    }

    return parentRepository.linkStudent(
      input.studentId,
      guardianId,
      input.relationship,
      input.isPrimary ?? false
    );
  }

  /**
   * Unlink a student from a guardian
   */
  async unlinkStudent(guardianId: string, studentId: string, context: ServiceContext) {
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError("You do not have permission to unlink students from guardians");
    }

    const guardian = await parentRepository.findById(guardianId);
    if (!guardian) {
      throw new NotFoundError("Guardian not found");
    }

    const link = await parentRepository.findStudentGuardianLink(studentId, guardianId);
    if (!link) {
      throw new NotFoundError("Student-guardian link not found");
    }

    await parentRepository.unlinkStudent(link.id);
  }
}

export const parentService = new ParentService();
