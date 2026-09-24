import { Prisma } from "@prisma/client";
import { SubjectTeacherAssignment } from "@/types/prisma-enums";
import { subjectTeacherAssignmentRepository } from "./subjectTeacherAssignment.repository";
import { teacherRepository } from "../teachers/teacher.repository";
import { subjectRepository } from "../subjects/subject.repository";
import { classRepository } from "../classes/class.repository";
import { academicYearRepository } from "../academic-years/academicYear.repository";
import prisma from "@/lib/db/prisma";
import { UnauthorizedError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { getErrorMessage } from "@/lib/utils";

/**
 * SubjectTeacherAssignment Service - Business Logic Layer
 *
 * CRITICAL SERVICE: Manages which teacher teaches what subject to which class.
 * This is the foundation for:
 * - Timetable generation
 * - Assessment creation
 * - Gradebook functionality
 */

// Service context for authorization
// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
// departmentId is populated by middleware after verifying HOD position
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
  departmentId?: string; // For HOD context (populated by withHODAccess middleware)
}

// Input DTOs
export interface CreateAssignmentInput {
  teacherId: string;
  subjectId: string;
  classId: string;
  academicYearId: string;
  classSubjectId?: string; // Optional - if provided, skips ClassSubject lookup
}

export interface BulkAssignInput {
  classId: string;
  academicYearId: string;
  assignments: Array<{
    teacherId: string;
    subjectId: string;
  }>;
}

export interface UpdateAssignmentInput {
  teacherId?: string;
}

export interface AssignmentFilters {
  teacherId?: string;
  subjectId?: string;
  classId?: string;
  academicYearId?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export class SubjectTeacherAssignmentService {
  // ==================== PERMISSION CHECKS ====================

  /**
   * Check if user can manage assignments
   */
  private canManage(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER", "DEPUTY_HEAD"].includes(context.role);
  }

  /**
   * Check if user can delete assignments
   */
  private canDelete(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  /**
   * Check if context includes HOD department scope
   * NOTE: We don't check if user "is" HOD (that's a derived position, not a role)
   * The middleware (withHODAccess) already verified the user is HOD
   * We just validate the context has the required department scope
   */
  private hasHODScope(context: ServiceContext & { departmentId?: string }): boolean {
    return !!context.departmentId;
  }

  // ==================== VALIDATION ====================

  /**
   * Validate that teacher is qualified for the subject
   * Checks TeacherSubject relationship
   */
  private async validateTeacherQualification(
    teacherId: string,
    subjectId: string
  ): Promise<void> {
    // Check if teacher has TeacherSubject entry for this subject
    const teacherSubject = await prisma.teacherSubject.findFirst({
      where: {
        teacherId,
        subjectId,
      },
    });

    if (!teacherSubject) {
      const [teacher, subject] = await Promise.all([
        teacherRepository.findById(teacherId),
        subjectRepository.findById(subjectId),
      ]);

      throw new ValidationError(
        `Teacher ${teacher?.firstName} ${teacher?.lastName} is not qualified to teach ${subject?.name}`
      );
    }
  }

  /**
   * Validate that subject is valid for the grade
   * Checks GradeSubject relationship
   */
  private async validateGradeSubject(
    subjectId: string,
    classId: string
  ): Promise<void> {
    const classEntity = await classRepository.findById(classId);
    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    // Check if subject is valid for this grade
    const gradeSubject = await prisma.gradeSubject.findFirst({
      where: {
        gradeId: classEntity.gradeId,
        subjectId,
      },
    });

    if (!gradeSubject) {
      const subject = await subjectRepository.findById(subjectId);
      throw new ValidationError(
        `${subject?.name} is not in the curriculum for this grade`
      );
    }
  }

  /**
   * Validate that subject exists in the class curriculum (ClassSubject)
   * This is the AUTHORITATIVE curriculum check - a subject must be explicitly
   * assigned to a class's curriculum before teachers can be assigned to it.
   *
   * Returns the ClassSubject if found, for potential use in assignments.
   */
  private async validateClassSubject(
    subjectId: string,
    classId: string
  ): Promise<{ id: string; isCore: boolean }> {
    // Check if subject is in this class's curriculum
    const classSubject = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
      select: {
        id: true,
        isCore: true,
      },
    });

    if (!classSubject) {
      const [subject, classEntity] = await Promise.all([
        subjectRepository.findById(subjectId),
        classRepository.findById(classId),
      ]);

      const className = classEntity
        ? `${classEntity.name}`
        : 'this class';

      throw new ValidationError(
        `${subject?.name || 'Subject'} is not in the curriculum for ${className}. ` +
        `Please add it to the class curriculum first.`
      );
    }

    return classSubject;
  }

  // ==================== BUSINESS LOGIC ====================

  /**
   * Create a new assignment
   */
  async createAssignment(
    data: CreateAssignmentInput,
    context: ServiceContext
  ): Promise<SubjectTeacherAssignment> {
    // Authorization
    if (!this.canManage(context)) {
      throw new UnauthorizedError(
        "You do not have permission to create assignments"
      );
    }

    // Validate references exist
    const [teacher, subject, classEntity, academicYear] = await Promise.all([
      teacherRepository.findById(data.teacherId),
      subjectRepository.findById(data.subjectId),
      classRepository.findById(data.classId),
      academicYearRepository.findById(data.academicYearId),
    ]);

    if (!teacher) {
      throw new NotFoundError("Teacher not found");
    }

    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    // Business rule: Cannot assign in closed academic year
    if (academicYear.isClosed) {
      throw new ValidationError(
        "Cannot create assignment in a closed academic year"
      );
    }

    // Business rule: Teacher must be qualified for the subject
    await this.validateTeacherQualification(data.teacherId, data.subjectId);

    // Business rule: Subject must be valid for the grade (GradeSubject)
    await this.validateGradeSubject(data.subjectId, data.classId);

    // Business rule: Subject must be in the class curriculum (ClassSubject)
    // This is the AUTHORITATIVE check - ClassSubject is the source of truth
    const classSubject = await this.validateClassSubject(data.subjectId, data.classId);

    // Business rule: Check for duplicate
    const exists = await subjectTeacherAssignmentRepository.exists(
      data.teacherId,
      data.subjectId,
      data.classId,
      data.academicYearId
    );

    if (exists) {
      throw new ConflictError(
        `${teacher.firstName} ${teacher.lastName} is already assigned to teach ${subject.name} to this class`
      );
    }

    // Create assignment with classSubjectId for FK integrity
    const assignment = await subjectTeacherAssignmentRepository.create({
      teacher: { connect: { id: data.teacherId } },
      subject: { connect: { id: data.subjectId } },
      class: { connect: { id: data.classId } },
      academicYear: { connect: { id: data.academicYearId } },
      classSubject: { connect: { id: classSubject.id } },
    });

    return assignment;
  }

  /**
   * Bulk create assignments for a class
   */
  async bulkAssign(
    data: BulkAssignInput,
    context: ServiceContext
  ): Promise<{
    successful: number;
    failed: Array<{ teacherId: string; subjectId: string; error: string }>;
  }> {
    // Authorization
    if (!this.canManage(context)) {
      throw new UnauthorizedError(
        "You do not have permission to create assignments"
      );
    }

    const results = {
      successful: 0,
      failed: [] as Array<{
        teacherId: string;
        subjectId: string;
        error: string;
      }>,
    };

    for (const assignment of data.assignments) {
      try {
        await this.createAssignment(
          {
            teacherId: assignment.teacherId,
            subjectId: assignment.subjectId,
            classId: data.classId,
            academicYearId: data.academicYearId,
          },
          context
        );
        results.successful++;
      } catch (error) {
        results.failed.push({
          teacherId: assignment.teacherId,
          subjectId: assignment.subjectId,
          error: getErrorMessage(error, "Unknown error"),
        });
      }
    }

    return results;
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(
    id: string,
    context: ServiceContext
  ): Promise<SubjectTeacherAssignment> {
    // Everyone can read assignments
    const assignment = await subjectTeacherAssignmentRepository.findById(id);

    if (!assignment) {
      throw new NotFoundError("Assignment not found");
    }

    return assignment;
  }

  /**
   * Get assignment with relations
   */
  async getAssignmentWithRelations(id: string, context: ServiceContext) {
    // Everyone can read assignments
    const assignment =
      await subjectTeacherAssignmentRepository.findByIdWithRelations(id);

    if (!assignment) {
      throw new NotFoundError("Assignment not found");
    }

    return assignment;
  }

  /**
   * Get assignments for a teacher
   */
  async getTeacherAssignments(
    teacherId: string,
    academicYearId: string | undefined,
    context: ServiceContext
  ) {
    // Everyone can read assignments
    return subjectTeacherAssignmentRepository.findByTeacher(
      teacherId,
      academicYearId
    );
  }

  /**
   * Get assignments for a class
   */
  async getClassAssignments(
    classId: string,
    academicYearId: string | undefined,
    context: ServiceContext
  ) {
    // Everyone can read assignments
    return subjectTeacherAssignmentRepository.findByClass(classId, academicYearId);
  }

  /**
   * Get assignments for a subject
   */
  async getSubjectAssignments(
    subjectId: string,
    academicYearId: string | undefined,
    context: ServiceContext
  ) {
    // Everyone can read assignments
    return subjectTeacherAssignmentRepository.findBySubject(
      subjectId,
      academicYearId
    );
  }

  /**
   * List assignments with filters
   */
  async listAssignments(
    filters: AssignmentFilters,
    pagination: PaginationParams,
    context: ServiceContext
  ) {
    // Everyone can list assignments

    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.SubjectTeacherAssignmentWhereInput = {};

    if (filters.teacherId) {
      where.teacherId = filters.teacherId;
    }

    if (filters.subjectId) {
      where.subjectId = filters.subjectId;
    }

    if (filters.classId) {
      where.classId = filters.classId;
    }

    if (filters.academicYearId) {
      where.academicYearId = filters.academicYearId;
    }

    // Fetch data
    const [assignments, total] = await Promise.all([
      subjectTeacherAssignmentRepository.findMany({
        skip,
        take: pageSize,
        where,
        include: {
          teacher: {
            include: {
              user: true,
            },
          },
          subject: true,
          class: {
            include: {
              grade: true,
            },
          },
          academicYear: true,
        },
        orderBy: [
          { class: { grade: { sequence: "asc" } } },
          { subject: { name: "asc" } },
        ] as any,
      }),
      subjectTeacherAssignmentRepository.count(where),
    ]);

    return {
      data: assignments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Update assignment (change teacher)
   */
  async updateAssignment(
    id: string,
    data: UpdateAssignmentInput,
    context: ServiceContext
  ): Promise<SubjectTeacherAssignment> {
    // Authorization
    if (!this.canManage(context)) {
      throw new UnauthorizedError(
        "You do not have permission to update assignments"
      );
    }

    // Check if assignment exists
    const existingAssignment =
      await subjectTeacherAssignmentRepository.findByIdWithRelations(id);
    if (!existingAssignment) {
      throw new NotFoundError("Assignment not found");
    }

    // Business rule: Cannot update in closed year
    if (existingAssignment.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot update assignment in a closed academic year"
      );
    }

    // If changing teacher, validate
    if (data.teacherId && data.teacherId !== existingAssignment.teacherId) {
      const newTeacher = await teacherRepository.findById(data.teacherId);
      if (!newTeacher) {
        throw new NotFoundError("New teacher not found");
      }

      // Validate teacher qualification
      await this.validateTeacherQualification(
        data.teacherId,
        existingAssignment.subjectId
      );

      // Check for duplicate
      const exists = await subjectTeacherAssignmentRepository.exists(
        data.teacherId,
        existingAssignment.subjectId,
        existingAssignment.classId,
        existingAssignment.academicYearId
      );

      if (exists) {
        throw new ConflictError(
          `${newTeacher.firstName} ${newTeacher.lastName} is already assigned to this subject for this class`
        );
      }
    }

    // Update
    const updatedAssignment = await subjectTeacherAssignmentRepository.update(
      id,
      {
        ...(data.teacherId && {
          teacher: { connect: { id: data.teacherId } },
        }),
      }
    );

    return updatedAssignment;
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(
    id: string,
    context: ServiceContext
  ): Promise<void> {
    // Authorization
    if (!this.canDelete(context)) {
      throw new UnauthorizedError(
        "You do not have permission to delete assignments"
      );
    }

    // Check if assignment exists
    const assignment =
      await subjectTeacherAssignmentRepository.findByIdWithRelations(id);
    if (!assignment) {
      throw new NotFoundError("Assignment not found");
    }

    // Business rule: Cannot delete from closed year
    if (assignment.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot delete assignment from a closed academic year"
      );
    }

    // TODO: Check if used in timetable or assessments
    // For now, Prisma foreign key constraint will prevent deletion if referenced

    // Delete
    try {
      await subjectTeacherAssignmentRepository.delete(id);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("referenced by timetable or assessments")) {
          throw new ValidationError(
            "Cannot delete assignment that is used in timetables or assessments"
          );
        }
      }
      throw error;
    }
  }

  /**
   * Get teacher workload
   */
  async getTeacherWorkload(
    teacherId: string,
    academicYearId: string,
    context: ServiceContext
  ) {
    // Everyone can view workload
    return subjectTeacherAssignmentRepository.getTeacherWorkload(
      teacherId,
      academicYearId
    );
  }

  // ==================== HOD-SPECIFIC METHODS ====================

  /**
   * Validate that subject belongs to HOD's department
   */
  private async validateSubjectDepartment(
    subjectId: string,
    departmentId: string
  ): Promise<void> {
    const subject = await subjectRepository.findById(subjectId);
    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    if (subject.departmentId !== departmentId) {
      throw new UnauthorizedError(
        "Subject does not belong to your department"
      );
    }
  }

  /**
   * Validate that teacher belongs to HOD's department
   */
  private async validateTeacherDepartment(
    teacherId: string,
    departmentId: string
  ): Promise<void> {
    const teacherDept = await prisma.teacherDepartment.findFirst({
      where: {
        teacherId,
        departmentId,
      },
    });

    if (!teacherDept) {
      throw new UnauthorizedError(
        "Teacher does not belong to your department"
      );
    }
  }

  /**
   * Validate that class is secondary grade (8-12)
   */
  private async validateSecondaryGrade(classId: string): Promise<void> {
    const SECONDARY_GRADES = [
      "GRADE_8",
      "GRADE_9",
      "GRADE_10",
      "GRADE_11",
      "GRADE_12",
    ];

    const classEntity = await classRepository.findById(classId);
    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    const grade = await prisma.grade.findUnique({
      where: { id: classEntity.gradeId },
    });

    if (!grade || !SECONDARY_GRADES.includes(grade.level)) {
      throw new UnauthorizedError(
        "HOD can only manage assignments for secondary grades (8-12)"
      );
    }
  }

  /**
   * Create assignment with HOD scoping
   * Validates: subject in department, teacher in department, class is secondary
   */
  async createAssignmentForHOD(
    data: CreateAssignmentInput,
    context: ServiceContext & { departmentId: string }
  ): Promise<SubjectTeacherAssignment> {
    // Validate HOD context
    if (!this.hasHODScope(context)) {
      throw new UnauthorizedError("HOD context required with departmentId");
    }

    // Validate department boundaries
    await this.validateSubjectDepartment(data.subjectId, context.departmentId);
    await this.validateTeacherDepartment(data.teacherId, context.departmentId);

    // Validate grade level
    await this.validateSecondaryGrade(data.classId);

    // Validate references exist (same as createAssignment)
    const [teacher, subject, classEntity, academicYear] = await Promise.all([
      teacherRepository.findById(data.teacherId),
      subjectRepository.findById(data.subjectId),
      classRepository.findById(data.classId),
      academicYearRepository.findById(data.academicYearId),
    ]);

    if (!teacher) {
      throw new NotFoundError("Teacher not found");
    }

    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    if (!academicYear) {
      throw new NotFoundError("Academic year not found");
    }

    // Business rule: Cannot assign in closed academic year
    if (academicYear.isClosed) {
      throw new ValidationError(
        "Cannot create assignment in a closed academic year"
      );
    }

    // Business rule: Teacher must be qualified for the subject
    await this.validateTeacherQualification(data.teacherId, data.subjectId);

    // Business rule: Subject must be in the class curriculum (ClassSubject)
    // This is the AUTHORITATIVE check - ClassSubject is the source of truth
    // If classSubjectId is provided, use it directly; otherwise validate and get it
    let classSubjectId = data.classSubjectId;
    if (!classSubjectId) {
      // If no classSubjectId provided, validate ClassSubject exists
      const classSubject = await this.validateClassSubject(data.subjectId, data.classId);
      classSubjectId = classSubject.id;
    }
    // NOTE: We skip GradeSubject validation because ClassSubject is the authoritative
    // source for what subjects a class offers. If a ClassSubject exists, that's sufficient.

    // Business rule: Check for duplicate
    const exists = await subjectTeacherAssignmentRepository.exists(
      data.teacherId,
      data.subjectId,
      data.classId,
      data.academicYearId
    );

    if (exists) {
      throw new ConflictError(
        `${teacher.firstName} ${teacher.lastName} is already assigned to teach ${subject.name} to this class`
      );
    }

    // Create assignment directly (HOD has validated authority)
    // Include classSubjectId for FK integrity
    const assignment = await subjectTeacherAssignmentRepository.create({
      teacher: { connect: { id: data.teacherId } },
      subject: { connect: { id: data.subjectId } },
      class: { connect: { id: data.classId } },
      academicYear: { connect: { id: data.academicYearId } },
      classSubject: { connect: { id: classSubjectId } },
    });

    return assignment;
  }

  /**
   * Update assignment with HOD scoping
   */
  async updateAssignmentForHOD(
    id: string,
    data: UpdateAssignmentInput,
    context: ServiceContext & { departmentId: string }
  ): Promise<SubjectTeacherAssignment> {
    // Validate HOD context
    if (!this.hasHODScope(context)) {
      throw new UnauthorizedError("HOD context required with departmentId");
    }

    // Check existing assignment belongs to department
    const existingAssignment =
      await subjectTeacherAssignmentRepository.findByIdWithRelations(id);
    if (!existingAssignment) {
      throw new NotFoundError("Assignment not found");
    }

    // Validate assignment belongs to HOD's department
    await this.validateSubjectDepartment(
      existingAssignment.subjectId,
      context.departmentId
    );

    // Validate class is secondary
    await this.validateSecondaryGrade(existingAssignment.classId);

    // Business rule: Cannot update in closed year
    if (existingAssignment.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot update assignment in a closed academic year"
      );
    }

    // If changing teacher, validate
    if (data.teacherId && data.teacherId !== existingAssignment.teacherId) {
      // Validate new teacher is in department
      await this.validateTeacherDepartment(data.teacherId, context.departmentId);

      const newTeacher = await teacherRepository.findById(data.teacherId);
      if (!newTeacher) {
        throw new NotFoundError("New teacher not found");
      }

      // Validate teacher qualification
      await this.validateTeacherQualification(
        data.teacherId,
        existingAssignment.subjectId
      );

      // Check for duplicate
      const exists = await subjectTeacherAssignmentRepository.exists(
        data.teacherId,
        existingAssignment.subjectId,
        existingAssignment.classId,
        existingAssignment.academicYearId
      );

      if (exists) {
        throw new ConflictError(
          `${newTeacher.firstName} ${newTeacher.lastName} is already assigned to this subject for this class`
        );
      }
    }

    // Update directly (HOD has validated authority)
    const updatedAssignment = await subjectTeacherAssignmentRepository.update(
      id,
      {
        ...(data.teacherId && {
          teacher: { connect: { id: data.teacherId } },
        }),
      }
    );

    return updatedAssignment;
  }

  /**
   * Delete assignment with HOD scoping
   */
  async deleteAssignmentForHOD(
    id: string,
    context: ServiceContext & { departmentId: string }
  ): Promise<void> {
    // Validate HOD context
    if (!this.hasHODScope(context)) {
      throw new UnauthorizedError("HOD context required with departmentId");
    }

    // Check existing assignment
    const assignment =
      await subjectTeacherAssignmentRepository.findByIdWithRelations(id);
    if (!assignment) {
      throw new NotFoundError("Assignment not found");
    }

    // Validate assignment belongs to HOD's department
    await this.validateSubjectDepartment(
      assignment.subjectId,
      context.departmentId
    );

    // Validate class is secondary
    await this.validateSecondaryGrade(assignment.classId);

    // Business rule: Cannot delete from closed year
    if (assignment.academicYear.isClosed) {
      throw new ValidationError(
        "Cannot delete assignment from a closed academic year"
      );
    }

    // Delete directly (HOD has validated authority)
    try {
      await subjectTeacherAssignmentRepository.delete(id);
    } catch (error) {
      if (error instanceof Error) {
        throw new ValidationError(
          `Cannot delete assignment: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * List assignments with HOD scoping
   * Automatically filters to department subjects and secondary grades
   */
  async listAssignmentsForHOD(
    filters: AssignmentFilters,
    pagination: PaginationParams,
    context: ServiceContext & { departmentId: string }
  ) {
    // Validate HOD context
    if (!this.hasHODScope(context)) {
      throw new UnauthorizedError("HOD context required with departmentId");
    }

    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    // Build where clause with department scoping
    const where: Prisma.SubjectTeacherAssignmentWhereInput = {
      // Scope to department subjects
      subject: {
        departmentId: context.departmentId,
      },
      // Scope to secondary grades only
      class: {
        grade: {
          level: {
            in: ["GRADE_8", "GRADE_9", "GRADE_10", "GRADE_11", "GRADE_12"],
          },
        },
      },
    };

    // Apply additional filters
    if (filters.teacherId) {
      where.teacherId = filters.teacherId;
    }

    if (filters.subjectId) {
      where.subjectId = filters.subjectId;
    }

    if (filters.classId) {
      where.classId = filters.classId;
    }

    if (filters.academicYearId) {
      where.academicYearId = filters.academicYearId;
    }

    // Fetch data
    const [assignments, total] = await Promise.all([
      subjectTeacherAssignmentRepository.findMany({
        skip,
        take: pageSize,
        where,
        include: {
          teacher: {
            include: {
              user: true,
            },
          },
          subject: true,
          class: {
            include: {
              grade: true,
            },
          },
          academicYear: true,
        },
        orderBy: [
          { class: { grade: { sequence: "asc" } } },
          { subject: { name: "asc" } },
        ] as any,
      }),
      subjectTeacherAssignmentRepository.count(where),
    ]);

    return {
      data: assignments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Bulk assign with HOD scoping
   */
  async bulkAssignForHOD(
    data: BulkAssignInput,
    context: ServiceContext & { departmentId: string }
  ): Promise<{
    successful: number;
    failed: Array<{ teacherId: string; subjectId: string; error: string }>;
  }> {
    // Validate HOD context
    if (!this.hasHODScope(context)) {
      throw new UnauthorizedError("HOD context required with departmentId");
    }

    // Validate class is secondary
    await this.validateSecondaryGrade(data.classId);

    const results = {
      successful: 0,
      failed: [] as Array<{
        teacherId: string;
        subjectId: string;
        error: string;
      }>,
    };

    for (const assignment of data.assignments) {
      try {
        await this.createAssignmentForHOD(
          {
            teacherId: assignment.teacherId,
            subjectId: assignment.subjectId,
            classId: data.classId,
            academicYearId: data.academicYearId,
          },
          context
        );
        results.successful++;
      } catch (error) {
        results.failed.push({
          teacherId: assignment.teacherId,
          subjectId: assignment.subjectId,
          error: getErrorMessage(error, "Unknown error"),
        });
      }
    }

    return results;
  }
}

// Singleton instance
export const subjectTeacherAssignmentService =
  new SubjectTeacherAssignmentService();
