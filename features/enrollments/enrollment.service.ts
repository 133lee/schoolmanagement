import { Prisma } from "@prisma/client";
import { StudentClassEnrollment, EnrollmentStatus, StudentStatus } from "@/types/prisma-enums";
import { enrollmentRepository } from "./enrollment.repository";
import { studentRepository } from "../students/student.repository";
import { classRepository } from "../classes/class.repository";
import { academicYearRepository } from "../academic-years/academicYear.repository";
import { UnauthorizedError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { getErrorMessage } from "@/lib/utils";

/**
 * Enrollment Service - Business Logic Layer
 *
 * Handles business rules, validation, and authorization for student class enrollment.
 */

// Service context for authorization
// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
}

// Input DTOs
export interface CreateEnrollmentInput {
  studentId: string;
  classId: string;
  academicYearId: string;
  enrollmentDate?: Date;
}

export interface BulkEnrollInput {
  studentIds: string[];
  classId: string;
  academicYearId: string;
  enrollmentDate?: Date;
}

export interface UpdateEnrollmentInput {
  classId?: string;
  status?: EnrollmentStatus;
  notes?: string;
}

export interface EnrollmentFilters {
  classId?: string;
  academicYearId?: string;
  status?: EnrollmentStatus;
  studentId?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export class EnrollmentService {
  // ==================== PERMISSION CHECKS ====================

  /**
   * Check if user can manage enrollments
   */
  private canManage(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD", "CLERK"].includes(
      context.role
    );
  }

  /**
   * Check if user can delete enrollments
   */
  private canDelete(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  // ==================== VALIDATION ====================

  /**
   * Validate enrollment date
   */
  private validateEnrollmentDate(
    enrollmentDate: Date,
    academicYearStart: Date,
    academicYearEnd: Date
  ): void {
    if (enrollmentDate < academicYearStart || enrollmentDate > academicYearEnd) {
      throw new ValidationError(
        "Enrollment date must be within the academic year"
      );
    }
  }

  // ==================== BUSINESS LOGIC ====================

  /**
   * Create a new enrollment
   */
  async createEnrollment(
    data: CreateEnrollmentInput,
    context: ServiceContext
  ): Promise<StudentClassEnrollment> {
    // Authorization
    if (!this.canManage(context)) {
      throw new UnauthorizedError(
        "You do not have permission to create enrollments"
      );
    }

    // Validate references exist
    const [student, classEntity, academicYear] = await Promise.all([
      studentRepository.findById(data.studentId),
      classRepository.findById(data.classId),
      academicYearRepository.findById(data.academicYearId),
    ]);

    if (!student) {
      throw new NotFoundError("Student not found");
    }

    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    // Business rule: Cannot enroll in closed academic year
    if (academicYear.isClosed) {
      throw new ValidationError("Cannot enroll in a closed academic year");
    }

    // Business rule: Cannot enroll withdrawn or graduated students
    if (student.status === "WITHDRAWN" || student.status === "GRADUATED") {
      throw new ValidationError(
        `Cannot enroll ${student.status.toLowerCase()} student`
      );
    }

    // Validate enrollment date if provided
    const enrollmentDate = data.enrollmentDate || new Date();
    this.validateEnrollmentDate(
      enrollmentDate,
      academicYear.startDate,
      academicYear.endDate
    );

    // The duplicate-enrollment check, capacity check, and create must run as
    // one atomic unit — otherwise two concurrent requests can both read the
    // count/existing-enrollment before either commits, letting a class end
    // up over capacity or a student double-enrolled (a classic
    // check-then-act race). A bare $transaction does NOT close this window
    // under Postgres's default READ COMMITTED isolation — each statement
    // sees the latest committed data, not a snapshot from transaction start,
    // so two concurrent transactions can both read "under capacity" before
    // either commits. lockClassForUpdate takes a row lock on the Class row
    // first, forcing the second transaction to wait for the first to finish
    // before it reads the count.
    return enrollmentRepository.withTransaction(async (tx) => {
      await enrollmentRepository.lockClassForUpdate(tx, data.classId);

      const existingEnrollment = await enrollmentRepository.findByStudentAndYear(
        data.studentId,
        data.academicYearId,
        tx
      );

      if (existingEnrollment) {
        throw new ConflictError(
          `Student is already enrolled in ${(existingEnrollment as any).class?.name ?? "a class"} for this academic year`
        );
      }

      const enrollmentCount = await enrollmentRepository.countActiveInClass(
        data.classId,
        data.academicYearId,
        tx
      );

      if (classEntity.capacity && enrollmentCount >= classEntity.capacity) {
        throw new ValidationError(
          `Class is at full capacity (${classEntity.capacity} students)`
        );
      }

      return enrollmentRepository.createInTransaction(tx, {
        student: { connect: { id: data.studentId } },
        class: { connect: { id: data.classId } },
        academicYear: { connect: { id: data.academicYearId } },
        enrollmentDate,
        status: EnrollmentStatus.ACTIVE,
      });
    });
  }

  /**
   * Bulk enroll students
   */
  async bulkEnroll(
    data: BulkEnrollInput,
    context: ServiceContext
  ): Promise<{ successful: number; failed: Array<{ studentId: string; error: string }> }> {
    // Authorization
    if (!this.canManage(context)) {
      throw new UnauthorizedError(
        "You do not have permission to create enrollments"
      );
    }

    const results = {
      successful: 0,
      failed: [] as Array<{ studentId: string; error: string }>,
    };

    for (const studentId of data.studentIds) {
      try {
        await this.createEnrollment(
          {
            studentId,
            classId: data.classId,
            academicYearId: data.academicYearId,
            enrollmentDate: data.enrollmentDate,
          },
          context
        );
        results.successful++;
      } catch (error) {
        results.failed.push({
          studentId,
          error: getErrorMessage(error, "Unknown error"),
        });
      }
    }

    return results;
  }

  /**
   * Get enrollment by ID
   */
  async getEnrollmentById(
    id: string,
    context: ServiceContext
  ): Promise<StudentClassEnrollment> {
    // Everyone can read enrollments
    const enrollment = await enrollmentRepository.findById(id);

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    return enrollment;
  }

  /**
   * Get enrollment with relations
   */
  async getEnrollmentWithRelations(id: string, context: ServiceContext) {
    // Everyone can read enrollments
    const enrollment = await enrollmentRepository.findByIdWithRelations(id);

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    return enrollment;
  }

  /**
   * Get students enrolled in a class
   */
  async getStudentsByClass(
    classId: string,
    academicYearId: string,
    context: ServiceContext
  ) {
    // Everyone can read enrollments
    return enrollmentRepository.findByClassAndYear(classId, academicYearId);
  }

  /**
   * Get student's enrollment history
   */
  async getStudentEnrollmentHistory(
    studentId: string,
    context: ServiceContext
  ) {
    // Everyone can read enrollments
    return enrollmentRepository.findByStudent(studentId);
  }

  /**
   * List enrollments with filters
   */
  async listEnrollments(
    filters: EnrollmentFilters,
    pagination: PaginationParams,
    context: ServiceContext
  ) {
    // Everyone can list enrollments

    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.StudentClassEnrollmentWhereInput = {};

    if (filters.classId) {
      where.classId = filters.classId;
    }

    if (filters.academicYearId) {
      where.academicYearId = filters.academicYearId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.studentId) {
      where.studentId = filters.studentId;
    }

    // Fetch data
    const [enrollments, total] = await Promise.all([
      enrollmentRepository.findMany({
        skip,
        take: pageSize,
        where,
        orderBy: { enrollmentDate: "desc" },
        include: {
          student: true,
          class: {
            include: { grade: true },
          },
          academicYear: true,
        },
      }),
      enrollmentRepository.count(where),
    ]);

    return {
      data: enrollments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Update enrollment
   * Edge Case #7: Changing Class Mid-Year (Stream Change)
   */
  async updateEnrollment(
    id: string,
    data: UpdateEnrollmentInput,
    context: ServiceContext
  ): Promise<StudentClassEnrollment> {
    // Authorization
    if (!this.canManage(context)) {
      throw new UnauthorizedError(
        "You do not have permission to update enrollments"
      );
    }

    // Check if enrollment exists
    const existingEnrollment = await enrollmentRepository.findByIdWithRelations(id);
    if (!existingEnrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    // Edge Case #9: Cannot update enrollment in closed year
    if (existingEnrollment.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot update enrollment in a closed academic year"
      );
    }

    // Edge Case #7: If changing class mid-year, track the change
    let classChangeData = {};
    if (data.classId && data.classId !== existingEnrollment.classId) {
      const newClass = await classRepository.findById(data.classId);
      if (!newClass) {
        throw new NotFoundError("New class not found");
      }

      // Check capacity
      const enrollmentCount = await enrollmentRepository.countActiveInClass(
        data.classId,
        existingEnrollment.academicYearId
      );

      if (newClass.capacity && enrollmentCount >= newClass.capacity) {
        throw new ValidationError(
          `Target class is at full capacity (${newClass.capacity} students)`
        );
      }

      // Edge Case #7: Track previous class and reason for change
      classChangeData = {
        previousClassId: existingEnrollment.classId,
        changedAt: new Date(),
        // changeReason should be passed in data if available
        ...(data.notes && { changeReason: data.notes }),
      };
    }

    // Update
    // Note: StudentClassEnrollment has no generic `notes` column — the only
    // place a caller-supplied reason is persisted is `changeReason`, set
    // above in classChangeData when the class is actually changing.
    const updatedEnrollment = await enrollmentRepository.update(id, {
      ...(data.classId && { class: { connect: { id: data.classId } } }),
      ...(data.status && { status: data.status }),
      ...classChangeData,
    });

    return updatedEnrollment;
  }

  /**
   * Delete enrollment
   */
  async deleteEnrollment(
    id: string,
    context: ServiceContext
  ): Promise<void> {
    // Authorization
    if (!this.canDelete(context)) {
      throw new UnauthorizedError(
        "You do not have permission to delete enrollments"
      );
    }

    // Check if enrollment exists
    const enrollment = await enrollmentRepository.findByIdWithRelations(id);
    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    // Business rule: Cannot delete from closed academic year
    if (enrollment.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot delete enrollment from a closed academic year"
      );
    }

    // Delete
    await enrollmentRepository.delete(id);
  }

  /**
   * Withdraw a student from a class — marks the enrollment WITHDRAWN
   * (preserving history, unlike the hard-delete `deleteEnrollment` above)
   * and marks the student's own status WITHDRAWN in the same transaction,
   * since "withdraw from class" means "withdrawn from school" here, not a
   * mid-year class reassignment (that's `updateEnrollment`'s classId path).
   */
  async withdrawStudentFromClass(
    id: string,
    reason: string | undefined,
    context: ServiceContext
  ): Promise<StudentClassEnrollment> {
    if (!this.canDelete(context)) {
      throw new UnauthorizedError(
        "You do not have permission to withdraw a student from a class"
      );
    }

    const enrollment = await enrollmentRepository.findByIdWithRelations(id);
    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    if (enrollment.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot withdraw a student from a closed academic year"
      );
    }

    if (enrollment.status === EnrollmentStatus.WITHDRAWN) {
      throw new ValidationError("This enrollment is already withdrawn");
    }

    return enrollmentRepository.withTransaction(async (tx) => {
      const updated = await enrollmentRepository.updateInTransaction(tx, id, {
        status: EnrollmentStatus.WITHDRAWN,
        changeReason: reason,
        changedAt: new Date(),
      });

      await studentRepository.updateInTransaction(tx, enrollment.studentId, {
        status: StudentStatus.WITHDRAWN,
      });

      return updated;
    });
  }

  /**
   * Get class enrollment statistics
   */
  async getClassEnrollmentStats(
    classId: string,
    academicYearId: string,
    context: ServiceContext
  ) {
    // Everyone can view stats

    const classEntity = await classRepository.findById(classId);
    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    const [total, active, transferred, withdrawn] = await Promise.all([
      enrollmentRepository.countByClass(classId, academicYearId),
      enrollmentRepository.countByClassAndStatus(
        classId,
        academicYearId,
        EnrollmentStatus.ACTIVE
      ),
      enrollmentRepository.countByClassAndStatus(
        classId,
        academicYearId,
        EnrollmentStatus.TRANSFERRED
      ),
      enrollmentRepository.countByClassAndStatus(
        classId,
        academicYearId,
        EnrollmentStatus.WITHDRAWN
      ),
    ]);

    return {
      classId,
      className: classEntity.name,
      capacity: classEntity.capacity,
      academicYearId,
      enrollmentStats: {
        total,
        active,
        transferred,
        withdrawn,
        availableSpots: classEntity.capacity ? classEntity.capacity - active : null,
        utilizationRate: classEntity.capacity
          ? Math.round((active / classEntity.capacity) * 100)
          : null,
      },
    };
  }

  // ==================== EDGE CASE VALIDATORS ====================

  /**
   * Edge Case #8: Attendance Without Enrollment
   * Validate that a student has an active enrollment before marking attendance
   */
  async validateStudentHasActiveEnrollment(
    studentId: string,
    classId: string,
    academicYearId: string
  ): Promise<void> {
    const enrollment = await enrollmentRepository.findByStudentClassAndYear(
      studentId,
      classId,
      academicYearId
    );

    if (!enrollment) {
      throw new ValidationError(
        "Student is not enrolled in this class for the current academic year"
      );
    }

    if (enrollment.status !== "ACTIVE") {
      throw new ValidationError(
        `Cannot mark attendance: Student enrollment status is ${enrollment.status}`
      );
    }
  }

  /**
   * Edge Case #5: Check for double enrollment (duplicate check)
   * Used by API layer as additional safety check
   */
  async checkDoubleEnrollment(
    studentId: string,
    academicYearId: string
  ): Promise<boolean> {
    const existingEnrollment = await enrollmentRepository.findByStudentAndYear(
      studentId,
      academicYearId
    );

    return !!existingEnrollment;
  }

  /**
   * Edge Case #1: Validate mid-year transfer
   * Ensures proper status transition when transferring
   */
  async validateTransfer(
    enrollmentId: string,
    newSchoolAcademicYearId?: string
  ): Promise<void> {
    const enrollment = await enrollmentRepository.findByIdWithRelations(enrollmentId);

    if (!enrollment) {
      throw new NotFoundError("Enrollment not found");
    }

    if (enrollment.status === "TRANSFERRED") {
      throw new ValidationError("Student has already been transferred");
    }

    if (enrollment.status !== "ACTIVE") {
      throw new ValidationError(
        `Cannot transfer student with status: ${enrollment.status}`
      );
    }

    // Edge Case #9: Cannot transfer in closed year
    if (enrollment.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot transfer student in a closed academic year"
      );
    }
  }
}

// Singleton instance
export const enrollmentService = new EnrollmentService();
