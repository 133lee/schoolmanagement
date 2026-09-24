import { Prisma } from "@prisma/client";
import {
  TeacherProfile,
  StaffStatus,
  Gender,
  QualificationLevel,
  TeacherSubjectRole,
} from "@/types/prisma-enums";
import { teacherRepository } from "./teacher.repository";
import { subjectRepository } from "../subjects/subject.repository";
import prisma from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { UnauthorizedError, NotFoundError, ValidationError } from "@/lib/errors";
import { sendStaffSms } from "@/lib/sms/send-staff-sms";
import { logger } from "@/lib/logger/logger";

/**
 * Teacher Service - Business Logic Layer
 *
 * Handles business rules, validation, and authorization for teacher operations.
 * Uses TeacherRepository for data access.
 */

// Service context for authorization
// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
}

// Input DTOs
export interface CreateTeacherInput {
  email: string; // Teacher's email address (will be used to create user account)
  staffNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  phone: string;
  address?: string;
  qualification: QualificationLevel;
  yearsExperience?: number;
  status?: StaffStatus;
  hireDate: Date;
  primarySubjectId: string;
  secondarySubjectId?: string;
  /** Up to MAX_PERMISSIBLE_SUBJECTS more subjects, beyond primary/secondary, that the teacher is permitted to teach. Must belong to the primary subject's department. */
  permissibleSubjectIds?: string[];
}

export interface UpdateTeacherInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  phone?: string;
  address?: string;
  qualification?: QualificationLevel;
  yearsExperience?: number;
  departmentId?: string;
  primarySubjectId?: string;
  secondarySubjectId?: string;
  permissibleSubjectIds?: string[];
}

export interface TeacherFilters {
  status?: StaffStatus;
  gender?: Gender;
  qualification?: QualificationLevel;
  search?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

// Primary/secondary subjects have no department restriction, but subjects a
// teacher is merely *permitted* (not necessarily qualified) to teach beyond
// those are capped and must stay within the primary subject's department —
// otherwise any teacher could be assigned to teach any subject school-wide.
const MAX_PERMISSIBLE_SUBJECTS = 2;

export class TeacherService {
  // ==================== PERMISSION CHECKS ====================

  /**
   * Check if user can create teachers
   * Only ADMIN and HEAD_TEACHER can create teachers
   */
  private canCreate(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  /**
   * Check if user can update teachers
   * Only ADMIN and HEAD_TEACHER can update teachers
   */
  private canUpdate(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  /**
   * Check if user can delete teachers
   * Only ADMIN can delete teachers
   */
  private canDelete(context: ServiceContext): boolean {
    return context.role === "ADMIN";
  }

  /**
   * Check if user can view teachers
   * All authenticated users can view teachers
   */
  private canView(_context: ServiceContext): boolean {
    return true; // All authenticated users can view
  }

  // ==================== VALIDATION METHODS ====================

  /**
   * Validate teacher age (must be between 21 and 70 years old)
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

    if (actualAge < 21 || actualAge > 70) {
      throw new ValidationError(
        `Invalid age: ${actualAge} years. Teacher age must be between 21 and 70 years.`
      );
    }
  }

  /**
   * Validate hire date (cannot be in the future)
   */
  private validateHireDate(hireDate: Date): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hireDateOnly = new Date(hireDate);
    hireDateOnly.setHours(0, 0, 0, 0);

    if (hireDateOnly > today) {
      throw new ValidationError("Hire date cannot be in the future");
    }
  }

  /**
   * Validate staff number format (e.g., STAFF2024001)
   * Format: STAFF + Year(4 digits) + Sequential(3 digits)
   */
  private validateStaffNumberFormat(staffNumber: string): void {
    const pattern = /^STAFF\d{4}\d{3}$/;
    if (!pattern.test(staffNumber)) {
      throw new ValidationError(
        "Invalid staff number format. Expected format: STAFF2024001 (STAFF + Year + Sequential number)"
      );
    }
  }

  /**
   * Check if staff number already exists
   */
  private async validateStaffNumberUnique(
    staffNumber: string,
    excludeId?: string
  ): Promise<void> {
    const existing = await teacherRepository.findByStaffNumber(staffNumber);
    if (existing && existing.id !== excludeId) {
      throw new ValidationError(`Staff number ${staffNumber} already exists`);
    }
  }

  /**
   * Validate years of experience (cannot be negative or exceed 50)
   */
  private validateYearsExperience(years: number): void {
    if (years < 0) {
      throw new ValidationError("Years of experience cannot be negative");
    }
    if (years > 50) {
      throw new ValidationError("Years of experience cannot exceed 50 years");
    }
  }

  /**
   * Normalize a Zambian phone number to canonical E.164 form (+260XXXXXXXXX).
   * Accepts either local (0XXXXXXXXX) or already-international (+260XXXXXXXXX)
   * input — the same two formats the Zod boundary schema allows — so a value
   * round-tripped from the DB into an edit form unchanged never fails here.
   */
  private normalizePhoneNumber(phone: string): string {
    if (/^\+260\d{9}$/.test(phone)) return phone;
    if (/^0\d{9}$/.test(phone)) return `+260${phone.slice(1)}`;
    throw new ValidationError(
      "Invalid phone number format. Expected +260XXXXXXXXX or 0XXXXXXXXX (Zambian mobile number)"
    );
  }

  /**
   * Validate email format
   * Accepts standard emails including Gmail, Yahoo, institutional emails, etc.
   */
  private validateEmail(email: string): void {
    // More permissive email pattern that accepts common formats
    // Allows alphanumeric, dots, hyphens, underscores in local part
    // Allows domains with multiple levels (e.g., mail.google.com, school.edu.zm)
    const pattern = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!email || typeof email !== 'string') {
      throw new ValidationError("Email is required");
    }

    if (!pattern.test(email.trim())) {
      throw new ValidationError(
        "Invalid email format. Please enter a valid email address (e.g., teacher@gmail.com or teacher@school.gov.zm)"
      );
    }
  }

  /**
   * Check if email already exists in the system
   */
  private async validateEmailUnique(email: string): Promise<void> {
    const existing = await teacherRepository.findUserByEmail(email);
    if (existing) {
      throw new ValidationError(`Email ${email} is already registered in the system`);
    }
  }

  /**
   * Validate the "permissible" subjects a teacher may teach beyond their
   * primary/secondary subjects. Caps the count, forbids overlap with
   * primary/secondary or duplicates among themselves, and requires each one
   * to belong to the same department as EITHER the primary OR the secondary
   * subject — a teacher with subjects spanning two departments (e.g. Physics
   * primary, French secondary) can pick permissible subjects from either one,
   * not just the primary's.
   */
  private async validatePermissibleSubjects(
    primarySubjectId: string,
    secondarySubjectId: string | undefined,
    permissibleSubjectIds: string[]
  ): Promise<void> {
    if (permissibleSubjectIds.length > MAX_PERMISSIBLE_SUBJECTS) {
      throw new ValidationError(
        `A teacher can have at most ${MAX_PERMISSIBLE_SUBJECTS} permissible subjects beyond primary/secondary`
      );
    }

    const reserved = [primarySubjectId, secondarySubjectId].filter(
      (id): id is string => Boolean(id)
    );
    if (permissibleSubjectIds.some((id) => reserved.includes(id))) {
      throw new ValidationError(
        "Permissible subjects must be different from the primary and secondary subjects"
      );
    }

    if (new Set(permissibleSubjectIds).size !== permissibleSubjectIds.length) {
      throw new ValidationError("Permissible subjects must not repeat");
    }

    if (permissibleSubjectIds.length === 0) return;

    const primarySubject = await subjectRepository.findById(primarySubjectId);
    if (!primarySubject) {
      throw new NotFoundError("Primary subject not found");
    }

    const secondarySubject = secondarySubjectId
      ? await subjectRepository.findById(secondarySubjectId)
      : null;

    const allowedDepartmentIds = new Set(
      [primarySubject.departmentId, secondarySubject?.departmentId].filter(
        (id): id is string => Boolean(id)
      )
    );

    const permissibleSubjects = await Promise.all(
      permissibleSubjectIds.map((id) => subjectRepository.findById(id))
    );

    permissibleSubjects.forEach((subject, index) => {
      if (!subject) {
        throw new NotFoundError(`Permissible subject ${permissibleSubjectIds[index]} not found`);
      }
      if (!subject.departmentId || !allowedDepartmentIds.has(subject.departmentId)) {
        throw new ValidationError(
          `${subject.name} is not in the same department as the teacher's primary subject (${primarySubject.name})` +
            (secondarySubject ? ` or secondary subject (${secondarySubject.name})` : "")
        );
      }
    });
  }

  /**
   * Tag each subject with its role so the resulting TeacherSubject rows can
   * later be told apart (e.g. to preselect them correctly on an edit form).
   */
  private buildSubjectRoleAssignments(
    primarySubjectId: string,
    secondarySubjectId: string | undefined,
    permissibleSubjectIds: string[]
  ): Array<{ subjectId: string; role: TeacherSubjectRole }> {
    const assignments: Array<{ subjectId: string; role: TeacherSubjectRole }> = [
      { subjectId: primarySubjectId, role: TeacherSubjectRole.PRIMARY },
    ];
    if (secondarySubjectId) {
      assignments.push({ subjectId: secondarySubjectId, role: TeacherSubjectRole.SECONDARY });
    }
    permissibleSubjectIds.forEach((subjectId) => {
      assignments.push({ subjectId, role: TeacherSubjectRole.PERMISSIBLE });
    });
    return assignments;
  }

  // ==================== PUBLIC API ====================

  /**
   * Create a new teacher
   */
  async createTeacher(
    input: CreateTeacherInput,
    context: ServiceContext
  ): Promise<TeacherProfile> {
    // Check permissions
    if (!this.canCreate(context)) {
      throw new UnauthorizedError(
        `${context.role} role cannot create teachers`
      );
    }

    // Validate inputs
    this.validateEmail(input.email);
    await this.validateEmailUnique(input.email);
    this.validateAge(input.dateOfBirth);
    this.validateHireDate(input.hireDate);
    this.validateStaffNumberFormat(input.staffNumber);
    await this.validateStaffNumberUnique(input.staffNumber);
    input.phone = this.normalizePhoneNumber(input.phone);

    if (input.yearsExperience !== undefined) {
      this.validateYearsExperience(input.yearsExperience);
    }

    // Hash the default password
    const defaultPassword = "teacher123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Create teacher with user account
    const teacherData: Prisma.TeacherProfileCreateInput = {
      staffNumber: input.staffNumber,
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      phone: input.phone,
      address: input.address,
      qualification: input.qualification,
      yearsExperience: input.yearsExperience || 0,
      status: input.status || StaffStatus.ACTIVE,
      hireDate: input.hireDate,
      user: {
        create: {
          email: input.email,
          passwordHash: passwordHash,
          role: "TEACHER",
          isActive: true,
          hasDefaultPassword: true, // Flag to indicate user needs to change password
        },
      },
    };

    const teacher = await teacherRepository.create(teacherData);

    // Send SMS with login credentials (fire-and-forget — don't block account creation)
    sendStaffSms(
      input.phone,
      `Your school system account has been created.\nEmail: ${input.email}\nPassword: teacher123\nPlease log in and change your password immediately.`
    ).catch((err) => logger.error("Account creation SMS failed", err instanceof Error ? err : undefined));

    // Assign subjects to the teacher
    const permissibleSubjectIds = input.permissibleSubjectIds ?? [];
    await this.validatePermissibleSubjects(
      input.primarySubjectId,
      input.secondarySubjectId,
      permissibleSubjectIds
    );
    await teacherRepository.assignSubjects(
      teacher.id,
      this.buildSubjectRoleAssignments(
        input.primarySubjectId,
        input.secondarySubjectId,
        permissibleSubjectIds
      )
    );

    return teacher;
  }

  /**
   * Get all teachers without pagination (for dropdowns/selectors)
   */
  async getAllTeachers(
    filters?: TeacherFilters,
    _context?: ServiceContext
  ): Promise<TeacherProfile[]> {
    // Build where clause (same logic as getTeachers)
    const where: Prisma.TeacherProfileWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.gender) {
      where.gender = filters.gender;
    }

    if (filters?.qualification) {
      where.qualification = filters.qualification;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { staffNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    where.deletedAt = null;

    return await (teacherRepository.findMany as any)({
      where,
      include: {
        user: { select: { email: true, role: true } },
        subjects: { include: { subject: true } },
        departments: { include: { department: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  }

  /**
   * Get all teachers with optional filters and pagination
   */
  async getTeachers(
    filters?: TeacherFilters,
    pagination?: PaginationParams,
    _context?: ServiceContext
  ): Promise<{
    data: TeacherProfile[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  }> {
    // Build where clause with proper typing
    const where: Prisma.TeacherProfileWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.gender) {
      where.gender = filters.gender;
    }

    if (filters?.qualification) {
      where.qualification = filters.qualification;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { staffNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await teacherRepository.count(where);

    // Apply pagination
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    // Fetch data
    const data = await teacherRepository.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
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
   * Get a single teacher by ID
   */
  async getTeacherById(
    id: string,
    context: ServiceContext
  ): Promise<TeacherProfile | null> {
    if (!this.canView(context)) {
      throw new UnauthorizedError(
        `${context.role} role cannot view teachers`
      );
    }

    return teacherRepository.findById(id);
  }

  /**
   * Get a single teacher by ID with relations (user, subjects, assignments)
   */
  async getTeacherByIdWithRelations(id: string, context: ServiceContext) {
    if (!this.canView(context)) {
      throw new UnauthorizedError(
        `${context.role} role cannot view teachers`
      );
    }

    return teacherRepository.findByIdWithRelations(id);
  }

  /**
   * Get teacher by staff number
   */
  async getTeacherByStaffNumber(
    staffNumber: string,
    context: ServiceContext
  ): Promise<TeacherProfile | null> {
    if (!this.canView(context)) {
      throw new UnauthorizedError(
        `${context.role} role cannot view teachers`
      );
    }

    return teacherRepository.findByStaffNumber(staffNumber);
  }

  /**
   * Get teacher by user ID
   */
  async getTeacherByUserId(
    userId: string,
    context: ServiceContext
  ): Promise<TeacherProfile | null> {
    if (!this.canView(context)) {
      throw new UnauthorizedError(
        `${context.role} role cannot view teachers`
      );
    }

    return teacherRepository.findByUserId(userId);
  }

  /**
   * Update teacher information
   */
  async updateTeacher(
    id: string,
    input: UpdateTeacherInput,
    context: ServiceContext
  ): Promise<TeacherProfile> {
    // Check permissions
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError(
        `${context.role} role cannot update teachers`
      );
    }

    // Verify teacher exists
    const existing = await teacherRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Teacher with ID ${id} not found`);
    }

    // Validate age if dateOfBirth is being updated
    if (input.dateOfBirth) {
      this.validateAge(input.dateOfBirth);
    }

    // Validate phone if being updated
    if (input.phone) {
      input.phone = this.normalizePhoneNumber(input.phone);
    }

    // Validate years of experience if being updated
    if (input.yearsExperience !== undefined) {
      this.validateYearsExperience(input.yearsExperience);
    }

    // Update teacher basic information
    const teacher = await teacherRepository.update(id, {
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      phone: input.phone,
      address: input.address,
      qualification: input.qualification,
      yearsExperience: input.yearsExperience,
    });

    // Update department assignment if provided
    if (input.departmentId) {
      // Remove existing department assignments
      await prisma.teacherDepartment.deleteMany({
        where: { teacherId: id },
      });

      // Create new primary department assignment
      await prisma.teacherDepartment.create({
        data: {
          teacherId: id,
          departmentId: input.departmentId,
          isPrimary: true,
        },
      });
    }

    // Update subjects if provided
    if (input.primarySubjectId) {
      const permissibleSubjectIds = input.permissibleSubjectIds ?? [];
      await this.validatePermissibleSubjects(
        input.primarySubjectId,
        input.secondarySubjectId,
        permissibleSubjectIds
      );
      await teacherRepository.assignSubjects(
        id,
        this.buildSubjectRoleAssignments(
          input.primarySubjectId,
          input.secondarySubjectId,
          permissibleSubjectIds
        )
      );
    }

    return teacher;
  }

  /**
   * Change teacher status
   * Business rule: Cannot reactivate RETIRED teachers
   */
  async changeTeacherStatus(
    id: string,
    newStatus: StaffStatus,
    context: ServiceContext
  ): Promise<TeacherProfile> {
    // Check permissions
    if (!this.canUpdate(context)) {
      throw new UnauthorizedError(
        `${context.role} role cannot change teacher status`
      );
    }

    // Verify teacher exists
    const existing = await teacherRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Teacher with ID ${id} not found`);
    }

    // Business rule: Cannot change status of retired teachers
    if (existing.status === StaffStatus.RETIRED) {
      throw new ValidationError(
        "Cannot change status of retired teachers. This is a final status."
      );
    }

    return teacherRepository.update(id, { status: newStatus });
  }

  /**
   * Terminate a teacher (soft delete by setting status to TERMINATED)
   */
  async terminateTeacher(
    id: string,
    context: ServiceContext
  ): Promise<TeacherProfile> {
    return this.changeTeacherStatus(id, StaffStatus.TERMINATED, context);
  }

  /**
   * Retire a teacher
   */
  async retireTeacher(
    id: string,
    context: ServiceContext
  ): Promise<TeacherProfile> {
    return this.changeTeacherStatus(id, StaffStatus.RETIRED, context);
  }

  /**
   * Delete a teacher (hard delete - only ADMIN)
   * This should rarely be used. Prefer status changes instead.
   */
  async deleteTeacher(id: string, context: ServiceContext): Promise<TeacherProfile> {
    // Check permissions
    if (!this.canDelete(context)) {
      throw new UnauthorizedError(
        `Only ADMIN can permanently delete teachers`
      );
    }

    // Verify teacher exists
    const existing = await teacherRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Teacher with ID ${id} not found`);
    }

    return teacherRepository.delete(id);
  }

  /**
   * Get teachers by status
   */
  async getTeachersByStatus(
    status: StaffStatus,
    context: ServiceContext
  ): Promise<TeacherProfile[]> {
    if (!this.canView(context)) {
      throw new UnauthorizedError(
        `${context.role} role cannot view teachers`
      );
    }

    return teacherRepository.findByStatus(status);
  }

  /**
   * Check if a staff number exists
   */
  async staffNumberExists(staffNumber: string): Promise<boolean> {
    return teacherRepository.existsByStaffNumber(staffNumber);
  }

  /**
   * Reset a teacher's password to the default and notify them via SMS.
   * Only ADMIN/HEAD_TEACHER can do this.
   */
  async resetPassword(teacherId: string, context: ServiceContext): Promise<void> {
    if (!["ADMIN", "HEAD_TEACHER"].includes(context.role)) {
      throw new UnauthorizedError("Only admins and head teachers can reset passwords");
    }

    const teacher = await teacherRepository.findByIdWithUser(teacherId);
    if (!teacher) {
      throw new NotFoundError("Teacher not found");
    }
    if (!teacher.user) {
      throw new ValidationError("Teacher has no login account");
    }

    const DEFAULT_PASSWORD = "teacher123";
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await teacherRepository.resetPassword(teacher.user.id, passwordHash);

    // Fire-and-forget SMS notification
    sendStaffSms(
      teacher.phone,
      `Your school system password has been reset by an administrator.\nEmail: ${teacher.user.email}\nNew password: ${DEFAULT_PASSWORD}\nPlease log in and change your password immediately.`
    ).catch((err) => logger.error("Password reset SMS failed", err instanceof Error ? err : undefined));
  }

  /**
   * Whether the logged-in user currently holds any teaching assignment
   * (class teacher and/or subject teacher) in the active academic year.
   */
  async getTeachingContext(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { select: { id: true } } },
    });

    if (!user || !user.profile) {
      return { hasTeachingContext: false, contexts: null };
    }
    const teacherId = user.profile.id;

    const academicYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    if (!academicYear) {
      return { hasTeachingContext: false, contexts: null };
    }

    const classAssignments = await prisma.classTeacherAssignment.findMany({
      where: { teacherId, academicYearId: academicYear.id },
      include: { class: { include: { grade: { select: { name: true } } } } },
    });

    const subjectAssignments = await prisma.subjectTeacherAssignment.findMany({
      where: { teacherId, academicYearId: academicYear.id },
      include: {
        subject: { select: { name: true, code: true } },
        class: { include: { grade: { select: { name: true } } } },
      },
    });

    const isClassTeacher = classAssignments.length > 0;
    const isSubjectTeacher = subjectAssignments.length > 0;
    const hasTeachingContext = isClassTeacher || isSubjectTeacher;

    return {
      hasTeachingContext,
      contexts: hasTeachingContext
        ? {
            isClassTeacher,
            isSubjectTeacher,
            classAssignments: classAssignments.map((a) => ({
              id: a.id,
              classId: a.classId,
              className: a.class.name,
              gradeName: a.class.grade.name,
            })),
            subjectAssignments: subjectAssignments.map((a) => ({
              id: a.id,
              subjectId: a.subjectId,
              subjectName: a.subject.name,
              subjectCode: a.subject.code,
              classId: a.classId,
              className: a.class.name,
              gradeName: a.class.grade.name,
            })),
          }
        : null,
    };
  }
}

export const teacherService = new TeacherService();
