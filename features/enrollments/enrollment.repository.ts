import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { StudentClassEnrollment, EnrollmentStatus,  } from "@/types/prisma-enums";

/**
 * Enrollment Repository - Enhanced Data Access Layer
 *
 * Handles Student ↔ Class ↔ AcademicYear relationships.
 * Transaction-safe operations for atomic enrollment management.
 * No business logic - pure data access with helper methods.
 */
export class EnrollmentRepository {
  /**
   * Create a new enrollment
   */
  async create(
    data: Prisma.StudentClassEnrollmentCreateInput
  ): Promise<StudentClassEnrollment> {
    try {
      return await prisma.studentClassEnrollment.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Student already enrolled in this academic year");
        }
        if (error.code === "P2003") {
          throw new Error(
            "Referenced student, class, or academic year not found"
          );
        }
      }
      throw error;
    }
  }

  /**
   * Acquires a Postgres row lock on the Class row for the duration of the
   * transaction. Required before the capacity count-then-insert in
   * createEnrollment: under Postgres's default READ COMMITTED isolation, a
   * bare $transaction does NOT prevent two concurrent transactions from both
   * reading "under capacity" before either commits (each statement sees the
   * latest committed snapshot, not a transaction-start snapshot) — only this
   * lock forces the second transaction to wait for the first to finish
   * before it reads the count, so it sees the up-to-date value.
   */
  async lockClassForUpdate(tx: Prisma.TransactionClient, classId: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM classes WHERE id = ${classId} FOR UPDATE`;
  }

  /**
   * Create enrollment within transaction context
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.StudentClassEnrollmentCreateInput
  ): Promise<StudentClassEnrollment> {
    return tx.studentClassEnrollment.create({ data });
  }

  /**
   * Find enrollment by ID (basic)
   */
  async findById(id: string): Promise<StudentClassEnrollment | null> {
    return prisma.studentClassEnrollment.findUnique({
      where: { id },
    });
  }

  /**
   * Find enrollment by ID within transaction
   */
  async findByIdInTransaction(
    tx: Prisma.TransactionClient,
    id: string
  ): Promise<StudentClassEnrollment | null> {
    return tx.studentClassEnrollment.findUnique({
      where: { id },
    });
  }

  /**
   * Find enrollment with full context
   * (Student, Class, Grade, Academic Year)
   */
  async findByIdWithRelations(id: string) {
    return prisma.studentClassEnrollment.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            studentGuardians: {
              include: {
                guardian: true,
              },
            },
          },
        },
        academicYear: true,
        class: {
          include: {
            grade: true,
          },
        },
      },
    });
  }

  /**
   * Find active enrollment for a student in an academic year
   */
  async findActiveByStudentAndYear(
    studentId: string,
    academicYearId: string
  ): Promise<StudentClassEnrollment | null> {
    return prisma.studentClassEnrollment.findFirst({
      where: {
        studentId,
        academicYearId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        class: {
          include: { grade: true },
        },
        academicYear: true,
      },
    });
  }

  /**
   * Find any enrollment (regardless of status) for student in academic year
   */
  async findByStudentAndYear(
    studentId: string,
    academicYearId: string,
    tx?: Prisma.TransactionClient
  ): Promise<StudentClassEnrollment | null> {
    const client = tx || prisma;
    return client.studentClassEnrollment.findFirst({
      where: {
        studentId,
        academicYearId,
      },
      include: {
        class: {
          include: { grade: true },
        },
        academicYear: true,
      },
    });
  }

  /**
   * Check if enrollment exists for student in academic year
   */
  async existsByStudentAndYear(
    studentId: string,
    academicYearId: string,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = tx || prisma;
    const count = await client.studentClassEnrollment.count({
      where: {
        studentId,
        academicYearId,
      },
    });
    return count > 0;
  }

  /**
   * Find all enrollments for a student (enrollment history)
   */
  async findByStudent(studentId: string) {
    return prisma.studentClassEnrollment.findMany({
      where: { studentId },
      orderBy: { enrollmentDate: "desc" },
      include: {
        class: {
          include: { grade: true },
        },
        academicYear: true,
      },
    });
  }

  /**
   * Find all enrollments for a class in an academic year
   */
  async findByClassAndYear(
    classId: string,
    academicYearId: string
  ): Promise<StudentClassEnrollment[]> {
    return prisma.studentClassEnrollment.findMany({
      where: {
        classId,
        academicYearId,
      },
      include: {
        student: {
          include: {
            studentGuardians: {
              where: { isPrimary: true },
              include: {
                guardian: true,
              },
            },
          },
        },
      },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    });
  }

  /**
   * Find active enrollments for a class in an academic year
   */
  async findActiveByClassAndYear(
    classId: string,
    academicYearId: string
  ): Promise<StudentClassEnrollment[]> {
    return prisma.studentClassEnrollment.findMany({
      where: {
        classId,
        academicYearId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        student: true,
      },
      orderBy: [
        { student: { lastName: "asc" } },
        { student: { firstName: "asc" } },
      ],
    });
  }

  /**
   * Count all enrollments in a class (regardless of status)
   * Used for capacity checks
   */
  async countByClass(
    classId: string,
    academicYearId: string,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const client = tx || prisma;
    return client.studentClassEnrollment.count({
      where: {
        classId,
        academicYearId,
      },
    });
  }

  /**
   * Count active enrollments in a class
   */
  async countActiveInClass(
    classId: string,
    academicYearId: string,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const client = tx || prisma;
    return client.studentClassEnrollment.count({
      where: {
        classId,
        academicYearId,
        status: EnrollmentStatus.ACTIVE,
      },
    });
  }

  /**
   * Count enrollments by status for a class
   */
  async countByClassAndStatus(
    classId: string,
    academicYearId: string,
    status: EnrollmentStatus
  ): Promise<number> {
    return prisma.studentClassEnrollment.count({
      where: {
        classId,
        academicYearId,
        status,
      },
    });
  }

  /**
   * Find enrollments by status
   */
  async findByStatus(
    status: EnrollmentStatus,
    academicYearId?: string
  ): Promise<StudentClassEnrollment[]> {
    return prisma.studentClassEnrollment.findMany({
      where: {
        status,
        ...(academicYearId && { academicYearId }),
      },
      include: {
        student: true,
        class: {
          include: { grade: true },
        },
        academicYear: true,
      },
      orderBy: { enrollmentDate: "desc" },
    });
  }

  /**
   * Paginated enrollment lookup
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.StudentClassEnrollmentWhereInput;
    orderBy?: Prisma.StudentClassEnrollmentOrderByWithRelationInput;
    include?: Prisma.StudentClassEnrollmentInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;

    return prisma.studentClassEnrollment.findMany({
      skip,
      take: Math.min(take, 100), // Cap at 100 records
      where,
      orderBy,
      include: include || {
        student: true,
        class: {
          include: { grade: true },
        },
        academicYear: true,
      },
    });
  }

  /**
   * Count enrollments matching criteria
   */
  async count(
    where?: Prisma.StudentClassEnrollmentWhereInput
  ): Promise<number> {
    return prisma.studentClassEnrollment.count({ where });
  }

  /**
   * Update enrollment
   */
  async update(
    id: string,
    data: Prisma.StudentClassEnrollmentUpdateInput
  ): Promise<StudentClassEnrollment> {
    try {
      return await prisma.studentClassEnrollment.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Enrollment not found");
        }
      }
      throw error;
    }
  }

  /**
   * Update enrollment within transaction
   */
  async updateInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    data: Prisma.StudentClassEnrollmentUpdateInput
  ): Promise<StudentClassEnrollment> {
    return tx.studentClassEnrollment.update({
      where: { id },
      data,
    });
  }

  /**
   * Update enrollment status
   */
  async updateStatus(
    id: string,
    status: EnrollmentStatus
  ): Promise<StudentClassEnrollment> {
    return this.update(id, { status });
  }

  /**
   * Update enrollment status within transaction
   */
  async updateStatusInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    status: EnrollmentStatus
  ): Promise<StudentClassEnrollment> {
    return this.updateInTransaction(tx, id, { status });
  }

  /**
   * Delete enrollment (hard delete)
   */
  async delete(id: string): Promise<StudentClassEnrollment> {
    try {
      return await prisma.studentClassEnrollment.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Enrollment not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete enrollment within transaction
   */
  async deleteInTransaction(
    tx: Prisma.TransactionClient,
    id: string
  ): Promise<StudentClassEnrollment> {
    return tx.studentClassEnrollment.delete({
      where: { id },
    });
  }

  /**
   * Transaction wrapper for complex operations
   */
  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(fn);
  }

  /**
   * Get enrollment statistics for academic year
   */
  async getStatsByAcademicYear(academicYearId: string) {
    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: { academicYearId },
      include: {
        student: true,
      },
    });

    const stats = {
      total: enrollments.length,
      active: 0,
      completed: 0,
      transferred: 0,
      withdrawn: 0,
      byGender: {
        male: 0,
        female: 0,
      },
    };

    enrollments.forEach((enrollment) => {
      // Count by status
      switch (enrollment.status) {
        case EnrollmentStatus.ACTIVE:
          stats.active++;
          break;
        case EnrollmentStatus.COMPLETED:
          stats.completed++;
          break;
        case EnrollmentStatus.TRANSFERRED:
          stats.transferred++;
          break;
        case EnrollmentStatus.WITHDRAWN:
          stats.withdrawn++;
          break;
      }

      // Count by gender
      if (enrollment.student.gender === "MALE") {
        stats.byGender.male++;
      } else {
        stats.byGender.female++;
      }
    });

    return stats;
  }

  /**
   * Bulk status update for enrollments
   */
  async bulkUpdateStatus(
    enrollmentIds: string[],
    status: EnrollmentStatus
  ): Promise<number> {
    const result = await prisma.studentClassEnrollment.updateMany({
      where: {
        id: { in: enrollmentIds },
      },
      data: {
        status,
      },
    });

    return result.count;
  }

  /**
   * Find enrollments needing completion (end of year)
   */
  async findActiveInCompletedYear(academicYearId: string) {
    return prisma.studentClassEnrollment.findMany({
      where: {
        academicYearId,
        status: EnrollmentStatus.ACTIVE,
        academicYear: {
          isClosed: true,
        },
      },
      include: {
        student: true,
        class: {
          include: { grade: true },
        },
      },
    });
  }

  /**
   * Find enrollment by student, class, and academic year
   * Edge Case #8: Used to validate student enrollment before marking attendance
   */
  async findByStudentClassAndYear(
    studentId: string,
    classId: string,
    academicYearId: string
  ): Promise<StudentClassEnrollment | null> {
    return prisma.studentClassEnrollment.findFirst({
      where: {
        studentId,
        classId,
        academicYearId,
      },
      include: {
        student: true,
        class: true,
        academicYear: true,
      },
    });
  }
}

// Singleton instance
export const enrollmentRepository = new EnrollmentRepository();
