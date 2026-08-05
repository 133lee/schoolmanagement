import { Prisma } from "@prisma/client";
import {
  Student,
  StudentStatus,
  Gender,
  VulnerabilityStatus,
  OrphanType,
  DeceasedParent,
  Role,
} from "@/types/prisma-enums";
import { studentRepository } from "./student.repository";
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import {
  requireAnyRole,
  requireMinimumRole,
  AuthContext,
} from "@/lib/auth/authorization";
import { hasRoleAuthority } from "@/lib/auth/role-hierarchy";
import { isHOD } from "@/lib/auth/position-helpers";

/**
 * Student Service - Business Logic Layer
 *
 * Handles business rules, validation, and authorization for student operations.
 * Uses StudentRepository for data access.
 */

// Service context for authorization (use centralized type)
export type ServiceContext = AuthContext;

// Input DTOs
export interface CreateStudentInput {
  studentNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  admissionDate: Date;
  status?: StudentStatus;
  address?: string;
  medicalInfo?: string;
  vulnerability?: VulnerabilityStatus;
}

// Bulk import types
export interface BulkImportStudentRow {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  studentNumber?: string; // Optional - auto-generated if not provided
  admissionDate: string;
  status?: string;
  address?: string;
  medicalInfo?: string;
  vulnerability?: string;
}

export interface BulkImportResult {
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    studentNumber?: string;
    error: string;
  }>;
}

export interface UpdateStudentInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  address?: string;
  medicalInfo?: string;
  status?: StudentStatus;
  statusChangeReason?: string;
  vulnerability?: VulnerabilityStatus;
  orphanType?: OrphanType;
  deceasedParent?: DeceasedParent;
}

export interface StudentFilters {
  status?: StudentStatus;
  gender?: Gender;
  search?: string;
  vulnerability?: VulnerabilityStatus;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export class StudentService {
  // ==================== PERMISSION CHECKS ====================
  // With role hierarchy, these checks are now much simpler
  // HOD automatically gets TEACHER permissions
  // HEAD_TEACHER automatically gets HOD permissions, etc.

  /**
   * Full student records include sensitive fields (medicalInfo, vulnerability,
   * orphanType, deceasedParent). These are broad, cross-class reads, so they're
   * limited to roles that plausibly need whole-school visibility: DEPUTY_HEAD and
   * above, CLERK (records administration), and HOD-positioned teachers. A plain
   * TEACHER should use the teacher-scoped endpoints (features/teachers/teacher-student.service.ts),
   * which already limit results to their own class/subject assignments.
   */
  private async canViewFullStudentRecords(
    context: ServiceContext
  ): Promise<boolean> {
    if (hasRoleAuthority(context.role, Role.DEPUTY_HEAD)) return true;
    if (context.role === Role.CLERK) return true;
    if (context.role === Role.TEACHER) return isHOD(context.userId);
    return false;
  }

  private async requireCanViewFullStudentRecords(
    context: ServiceContext
  ): Promise<void> {
    if (!(await this.canViewFullStudentRecords(context))) {
      throw new UnauthorizedError(
        "Insufficient permissions to view student records"
      );
    }
  }

  // ==================== VALIDATION METHODS ====================

  /**
   * Validate student age (must be between 5 and 25 years old)
   */
  private validateAge(dateOfBirth: Date): void {
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    const dayDiff = today.getDate() - dateOfBirth.getDate();

    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      actualAge--;
    }

    if (actualAge < 3 || actualAge > 25) {
      throw new ValidationError(
        `Invalid age: ${actualAge} years. Student age must be between 3 and 25 years.`
      );
    }
  }

  /**
   * Validate admission date (cannot be in the future)
   */
  private validateAdmissionDate(admissionDate: Date): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const admissionDateOnly = new Date(admissionDate);
    admissionDateOnly.setHours(0, 0, 0, 0);

    if (admissionDateOnly > today) {
      throw new ValidationError("Admission date cannot be in the future");
    }
  }

  /**
   * Validate student number format (e.g., STU-2024-0001)
   * Format: STU-YYYY-NNNN (Year + 4-digit sequential)
   */
  private validateStudentNumberFormat(studentNumber: string): void {
    const pattern = /^STU-\d{4}-\d{4}$/;
    if (!pattern.test(studentNumber)) {
      throw new ValidationError(
        "Invalid student number format. Expected format: STU-2024-0001 (STU-YYYY-NNNN)"
      );
    }
  }

  /**
   * Check if student number already exists
   */
  private async validateStudentNumberUnique(
    studentNumber: string,
    excludeId?: string
  ): Promise<void> {
    const existing = await studentRepository.findByStudentNumber(studentNumber);
    if (existing && existing.id !== excludeId) {
      throw new ValidationError(
        `Student number ${studentNumber} already exists`
      );
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Create a new student
   * Only CLERK or higher can create students
   */
  async createStudent(
    input: CreateStudentInput,
    context: ServiceContext
  ): Promise<Student> {
    // Check permissions using role hierarchy
    // CLERK, HOD, DEPUTY_HEAD, HEAD_TEACHER, ADMIN can all create students
    requireAnyRole(
      context,
      [Role.CLERK, Role.TEACHER],
      "Insufficient permissions to create students"
    );

    // Validate inputs
    this.validateAge(input.dateOfBirth);
    this.validateAdmissionDate(input.admissionDate);
    this.validateStudentNumberFormat(input.studentNumber);
    await this.validateStudentNumberUnique(input.studentNumber);

    // Create student with default status if not provided
    const studentData = {
      ...input,
      status: input.status || StudentStatus.ACTIVE,
    };

    return studentRepository.create(studentData);
  }

  /**
   * Get all students with optional filters and pagination
   */

  /**
   * Get all students without pagination (for dropdowns/selectors)
   */
  async getAllStudents(
    filters?: StudentFilters,
    context?: ServiceContext,
    academicYearId?: string,
    filterUnenrolled?: boolean,
    filterEnrolled?: boolean
  ): Promise<Student[]> {
    if (!context) {
      throw new UnauthorizedError("Authentication required to view students");
    }
    await this.requireCanViewFullStudentRecords(context);

    // Build where clause (same logic as getStudents)
    const where: Prisma.StudentWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.gender) {
      where.gender = filters.gender;
    }

    if (filters?.vulnerability) {
      where.vulnerability = filters.vulnerability;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { studentNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Filter by enrollment status for a specific academic year
    if (academicYearId) {
      if (filterUnenrolled) {
        where.enrollments = {
          none: {
            academicYearId: academicYearId,
            status: "ACTIVE",
          },
        };
      } else if (filterEnrolled) {
        where.enrollments = {
          some: {
            academicYearId: academicYearId,
            status: "ACTIVE",
          },
        };
      }
    }

    const includeEnrollments = academicYearId
      ? {
          enrollments: {
            where: {
              academicYearId: academicYearId,
              status: "ACTIVE",
            },
            include: {
              class: {
                include: {
                  grade: true,
                },
              },
            },
          },
        }
      : undefined;

    return await (studentRepository.findMany as any)({
      where,
      include: includeEnrollments,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  }

  async getStudents(
    filters?: StudentFilters,
    pagination?: PaginationParams,
    context?: ServiceContext,
    academicYearId?: string,
    filterUnenrolled?: boolean,
    filterEnrolled?: boolean
  ): Promise<{
    data: Student[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    if (!context) {
      throw new UnauthorizedError("Authentication required to view students");
    }
    await this.requireCanViewFullStudentRecords(context);

    // Build where clause with proper typing
    const where: Prisma.StudentWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.gender) {
      where.gender = filters.gender;
    }

    if (filters?.vulnerability) {
      where.vulnerability = filters.vulnerability;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { studentNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Filter by enrollment status for a specific academic year
    if (academicYearId) {
      if (filterUnenrolled) {
        // Students who do NOT have an active enrollment for this academic year
        where.enrollments = {
          none: {
            academicYearId: academicYearId,
            status: "ACTIVE",
          },
        };
      } else if (filterEnrolled) {
        // Students who DO have an active enrollment for this academic year
        where.enrollments = {
          some: {
            academicYearId: academicYearId,
            status: "ACTIVE",
          },
        };
      }
    }

    // Get total count
    const total = await studentRepository.count(where);

    // Apply pagination
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    // Fetch data with enrollments included for display when filtering
    const includeEnrollments = academicYearId
      ? {
          enrollments: {
            where: {
              academicYearId: academicYearId,
              status: "ACTIVE",
            },
            include: {
              class: {
                include: {
                  grade: true,
                },
              },
            },
          },
        }
      : undefined;

    const data = await (studentRepository.findMany as any)({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: includeEnrollments,
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
   * Get a single student by ID
   * All authenticated users can view students
   */
  async getStudentById(
    id: string,
    context: ServiceContext
  ): Promise<Student | null> {
    await this.requireCanViewFullStudentRecords(context);
    return studentRepository.findById(id);
  }

  /**
   * Get a single student by ID with relations (guardians, enrollments)
   */
  async getStudentByIdWithRelations(id: string, context: ServiceContext) {
    await this.requireCanViewFullStudentRecords(context);
    return studentRepository.findByIdWithRelations(id);
  }

  /**
   * Update student information
   * Only CLERK or higher can update students
   */
  async updateStudent(
    id: string,
    input: UpdateStudentInput,
    context: ServiceContext
  ): Promise<Student> {
    // Check permissions using role hierarchy
    requireAnyRole(
      context,
      [Role.CLERK, Role.TEACHER],
      "Insufficient permissions to update students"
    );

    // Verify student exists
    const existing = await studentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Student with ID ${id} not found`);
    }

    // Validate age if dateOfBirth is being updated
    if (input.dateOfBirth) {
      this.validateAge(input.dateOfBirth);
    }

    return studentRepository.update(id, input);
  }

  /**
   * Change student status
   * Business rule: Cannot reactivate GRADUATED students
   * Only CLERK or higher can change status
   */
  async changeStudentStatus(
    id: string,
    newStatus: StudentStatus,
    context: ServiceContext
  ): Promise<Student> {
    // Check permissions using role hierarchy
    requireAnyRole(
      context,
      [Role.CLERK, Role.TEACHER],
      "Insufficient permissions to change student status"
    );

    // Verify student exists
    const existing = await studentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Student with ID ${id} not found`);
    }

    // Business rule: Cannot change status of graduated students
    if (existing.status === StudentStatus.GRADUATED) {
      throw new ValidationError(
        "Cannot change status of graduated students. This is a final status."
      );
    }

    return studentRepository.update(id, { status: newStatus });
  }

  /**
   * Withdraw a student (soft delete by setting status to WITHDRAWN)
   */
  async withdrawStudent(id: string, context: ServiceContext): Promise<Student> {
    return this.changeStudentStatus(id, StudentStatus.WITHDRAWN, context);
  }

  /**
   * Delete a student (hard delete - only ADMIN)
   * This should rarely be used. Prefer status changes instead.
   */
  async deleteStudent(id: string, context: ServiceContext): Promise<Student> {
    // Check permissions - only ADMIN can hard delete
    requireMinimumRole(
      context,
      Role.ADMIN,
      "Only ADMIN can permanently delete students"
    );

    // Verify student exists
    const existing = await studentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Student with ID ${id} not found`);
    }

    return studentRepository.delete(id);
  }

  /**
   * Get students by status
   * All authenticated users can view students
   */
  async getStudentsByStatus(
    status: StudentStatus,
    context: ServiceContext
  ): Promise<Student[]> {
    await this.requireCanViewFullStudentRecords(context);
    return studentRepository.findByStatus(status);
  }

  /**
   * Check if a student number exists
   */
  async studentNumberExists(studentNumber: string): Promise<boolean> {
    return studentRepository.existsByStudentNumber(studentNumber);
  }

  // ==================== BULK IMPORT ====================

  /**
   * Generate a unique student number
   * Format: STU-YYYY-NNNN (Year + 4-digit sequential)
   */
  private async generateUniqueStudentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      // Generate random 4-digit number
      const random = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      const studentNumber = `STU-${year}-${random}`;

      // Check if it already exists
      const exists = await studentRepository.existsByStudentNumber(
        studentNumber
      );
      if (!exists) {
        return studentNumber;
      }
      attempts++;
    }

    throw new ValidationError(
      "Failed to generate unique student number after multiple attempts"
    );
  }

  /**
   * Parse and validate a single row from CSV import
   * Note: studentNumber is optional - will be auto-generated if not provided
   */
  private parseImportRow(
    row: BulkImportStudentRow,
    rowNumber: number
  ): Omit<CreateStudentInput, "studentNumber"> & { studentNumber?: string } {
    // Validate required fields
    if (!row.firstName?.trim()) {
      throw new ValidationError(`Row ${rowNumber}: First name is required`);
    }
    if (!row.lastName?.trim()) {
      throw new ValidationError(`Row ${rowNumber}: Last name is required`);
    }
    if (!row.gender?.trim()) {
      throw new ValidationError(`Row ${rowNumber}: Gender is required`);
    }
    if (!row.dateOfBirth?.trim()) {
      throw new ValidationError(`Row ${rowNumber}: Date of birth is required`);
    }
    if (!row.admissionDate?.trim()) {
      throw new ValidationError(`Row ${rowNumber}: Admission date is required`);
    }

    // Parse gender
    const genderUpper = row.gender.trim().toUpperCase();
    if (genderUpper !== "MALE" && genderUpper !== "FEMALE") {
      throw new ValidationError(
        `Row ${rowNumber}: Invalid gender "${row.gender}". Must be MALE or FEMALE`
      );
    }
    const gender = genderUpper as Gender;

    // Parse dates
    const dateOfBirth = new Date(row.dateOfBirth.trim());
    if (isNaN(dateOfBirth.getTime())) {
      throw new ValidationError(
        `Row ${rowNumber}: Invalid date of birth "${row.dateOfBirth}". Use YYYY-MM-DD format`
      );
    }

    const admissionDate = new Date(row.admissionDate.trim());
    if (isNaN(admissionDate.getTime())) {
      throw new ValidationError(
        `Row ${rowNumber}: Invalid admission date "${row.admissionDate}". Use YYYY-MM-DD format`
      );
    }

    // Parse status (optional)
    let status: StudentStatus | undefined;
    if (row.status?.trim()) {
      const statusUpper = row.status.trim().toUpperCase();
      if (
        !Object.values(StudentStatus).includes(statusUpper as StudentStatus)
      ) {
        throw new ValidationError(
          `Row ${rowNumber}: Invalid status "${
            row.status
          }". Valid values: ${Object.values(StudentStatus).join(", ")}`
        );
      }
      status = statusUpper as StudentStatus;
    }

    // Parse vulnerability (optional)
    let vulnerability: VulnerabilityStatus | undefined;
    if (row.vulnerability?.trim()) {
      const vulnUpper = row.vulnerability.trim().toUpperCase();
      if (
        !Object.values(VulnerabilityStatus).includes(
          vulnUpper as VulnerabilityStatus
        )
      ) {
        throw new ValidationError(
          `Row ${rowNumber}: Invalid vulnerability status "${
            row.vulnerability
          }". Valid values: ${Object.values(VulnerabilityStatus).join(", ")}`
        );
      }
      vulnerability = vulnUpper as VulnerabilityStatus;
    }

    // Student number is optional - will be auto-generated if not provided
    const studentNumber = row.studentNumber?.trim() || undefined;

    return {
      firstName: row.firstName.trim(),
      middleName: row.middleName?.trim() || undefined,
      lastName: row.lastName.trim(),
      gender,
      dateOfBirth,
      studentNumber,
      admissionDate,
      status,
      address: row.address?.trim() || undefined,
      medicalInfo: row.medicalInfo?.trim() || undefined,
      vulnerability,
    };
  }

  /**
   * Bulk import students from CSV data
   * Only CLERK or higher can import students
   * Student numbers are auto-generated if not provided in the CSV
   */
  async bulkImportStudents(
    rows: BulkImportStudentRow[],
    context: ServiceContext
  ): Promise<BulkImportResult> {
    // Check permissions
    requireAnyRole(
      context,
      [Role.CLERK, Role.TEACHER],
      "Insufficient permissions to import students"
    );

    const result: BulkImportResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +2 because row 1 is header, and we're 0-indexed
      const row = rows[i];

      try {
        // Parse and validate row data
        const studentInput = this.parseImportRow(row, rowNumber);

        // Additional validations (same as createStudent)
        this.validateAge(studentInput.dateOfBirth);
        this.validateAdmissionDate(studentInput.admissionDate);

        // Generate student number if not provided, otherwise validate the provided one
        let finalStudentNumber: string;
        if (studentInput.studentNumber) {
          this.validateStudentNumberFormat(studentInput.studentNumber);
          await this.validateStudentNumberUnique(studentInput.studentNumber);
          finalStudentNumber = studentInput.studentNumber;
        } else {
          finalStudentNumber = await this.generateUniqueStudentNumber();
        }

        // Create the student
        await studentRepository.create({
          ...studentInput,
          studentNumber: finalStudentNumber,
          status: studentInput.status || StudentStatus.ACTIVE,
          vulnerability:
            studentInput.vulnerability || VulnerabilityStatus.NOT_VULNERABLE,
        });

        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          studentNumber: row.studentNumber,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return result;
  }
}

export const studentService = new StudentService();
