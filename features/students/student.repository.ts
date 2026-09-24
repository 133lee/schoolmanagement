import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { Student } from "@/types/prisma-enums";

/**
 * Student Repository - Data Access Layer
 *
 * Thin abstraction over Prisma for Student entity.
 * No business logic. No validation. Just database operations.
 */
export class StudentRepository {
  /**
   * Create a new student record
   */
  create(data: Prisma.StudentCreateInput): Promise<Student> {
    return prisma.student.create({ data });
  }

  /**
   * Find all students
   */
  findAll(): Promise<Student[]> {
    return prisma.student.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find student by ID
   */
  findById(id: string): Promise<Student | null> {
    return prisma.student.findUnique({
      where: { id },
    });
  }

  /**
   * Find student by ID with relations
   */
  findByIdWithRelations(id: string) {
    return prisma.student.findUnique({
      where: { id },
      include: {
        studentGuardians: {
          include: {
            guardian: true,
          },
        },
        enrollments: {
          include: {
            class: {
              include: {
                grade: true,
              },
            },
            academicYear: true,
          },
        },
      },
    });
  }

  /**
   * Find student by student number
   */
  findByStudentNumber(studentNumber: string): Promise<Student | null> {
    return prisma.student.findUnique({
      where: { studentNumber },
    });
  }

  /**
   * Find students by status
   */
  findByStatus(status: Student["status"]) {
    return prisma.student.findMany({
      where: { status },
    });
  }

  /**
   * Find students with pagination
   * Includes current enrollment and grade information
   */
  findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.StudentWhereInput;
    orderBy?: Prisma.StudentOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return prisma.student.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        enrollments: {
          where: {
            status: "ACTIVE",
          },
          include: {
            class: {
              include: {
                grade: true,
              },
            },
            academicYear: {
              select: {
                year: true,
                isActive: true,
              },
            },
          },
          take: 1,
          orderBy: {
            enrollmentDate: "desc",
          },
        },
        studentGuardians: {
          include: {
            guardian: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Lightweight existence check for a batch of student IDs (no relations) —
   * used to validate a bulk operation's student list in one query.
   */
  async findManyByIds(ids: string[]): Promise<{ id: string }[]> {
    return prisma.student.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
  }

  /**
   * Count students matching criteria
   */
  count(where?: Prisma.StudentWhereInput): Promise<number> {
    return prisma.student.count({ where });
  }

  /**
   * Update student by ID
   */
  update(id: string, data: Prisma.StudentUpdateInput): Promise<Student> {
    return prisma.student.update({
      where: { id },
      data,
    });
  }

  /**
   * Update student within an existing transaction
   */
  updateInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    data: Prisma.StudentUpdateInput
  ): Promise<Student> {
    return tx.student.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete student by ID
   */
  delete(id: string): Promise<Student> {
    return prisma.student.delete({
      where: { id },
    });
  }

  /**
   * Check if student number exists
   */
  async existsByStudentNumber(studentNumber: string): Promise<boolean> {
    const count = await prisma.student.count({
      where: { studentNumber },
    });
    return count > 0;
  }
}

export const studentRepository = new StudentRepository();
