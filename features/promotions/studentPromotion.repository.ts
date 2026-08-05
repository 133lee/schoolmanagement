import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { StudentPromotion, PromotionStatus, GradeLevel } from "@/types/prisma-enums";

/**
 * StudentPromotion Repository - Data Access Layer
 *
 * Manages student grade promotions.
 * No business logic - pure data access.
 */
export class StudentPromotionRepository {
  /**
   * Create a new student promotion record
   */
  async create(data: Prisma.StudentPromotionCreateInput): Promise<StudentPromotion> {
    try {
      return await prisma.studentPromotion.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new Error("Referenced student or approver not found");
        }
      }
      throw error;
    }
  }

  /**
   * Create promotion within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.StudentPromotionCreateInput
  ): Promise<StudentPromotion> {
    return tx.studentPromotion.create({ data });
  }

  /**
   * Find promotion by ID
   */
  async findById(id: string): Promise<StudentPromotion | null> {
    return prisma.studentPromotion.findUnique({
      where: { id },
    });
  }

  /**
   * Find promotion by ID with relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.studentPromotion.findUnique({
      where: { id },
      include: {
        student: true,
        approver: true,
      },
    });
  }

  /**
   * Find all promotions
   */
  async findAll(): Promise<StudentPromotion[]> {
    return prisma.studentPromotion.findMany({
      orderBy: { approvedAt: "desc" },
      include: {
        student: {
          select: {
            studentNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        approver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Find promotions by student
   */
  async findByStudent(studentId: string): Promise<StudentPromotion[]> {
    return prisma.studentPromotion.findMany({
      where: { studentId },
      orderBy: { academicYear: "desc" },
      include: {
        approver: true,
      },
    });
  }

  /**
   * Find promotions by academic year
   */
  async findByAcademicYear(academicYear: number): Promise<StudentPromotion[]> {
    return prisma.studentPromotion.findMany({
      where: { academicYear },
      orderBy: { approvedAt: "desc" },
      include: {
        student: true,
        approver: true,
      },
    });
  }

  /**
   * Find promotions by status
   */
  async findByStatus(status: PromotionStatus): Promise<StudentPromotion[]> {
    return prisma.studentPromotion.findMany({
      where: { status },
      orderBy: { approvedAt: "desc" },
      include: {
        student: true,
      },
    });
  }

  /**
   * Find promotions by from grade level
   */
  async findByFromGrade(fromGradeLevel: GradeLevel): Promise<StudentPromotion[]> {
    return prisma.studentPromotion.findMany({
      where: { fromGradeLevel },
      include: {
        student: true,
      },
    });
  }

  /**
   * Find promotions by to grade level
   */
  async findByToGrade(toGradeLevel: GradeLevel): Promise<StudentPromotion[]> {
    return prisma.studentPromotion.findMany({
      where: { toGradeLevel },
      include: {
        student: true,
      },
    });
  }

  /**
   * Find promotion by student and year
   */
  async findByStudentAndYear(
    studentId: string,
    academicYear: number
  ): Promise<StudentPromotion | null> {
    return prisma.studentPromotion.findFirst({
      where: {
        studentId,
        academicYear,
      },
    });
  }

  /**
   * Find many with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.StudentPromotionWhereInput;
    orderBy?: Prisma.StudentPromotionOrderByWithRelationInput;
    include?: Prisma.StudentPromotionInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;

    return prisma.studentPromotion.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || { approvedAt: "desc" },
      include: include || {
        student: true,
        approver: true,
      },
    });
  }

  /**
   * Count promotions
   */
  async count(where?: Prisma.StudentPromotionWhereInput): Promise<number> {
    return prisma.studentPromotion.count({ where });
  }

  /**
   * Update promotion
   */
  async update(
    id: string,
    data: Prisma.StudentPromotionUpdateInput
  ): Promise<StudentPromotion> {
    try {
      return await prisma.studentPromotion.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Student promotion not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete promotion
   */
  async delete(id: string): Promise<StudentPromotion> {
    try {
      return await prisma.studentPromotion.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Student promotion not found");
        }
      }
      throw error;
    }
  }

  /**
   * Transaction wrapper
   */
  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(fn);
  }
}

// Singleton instance
export const studentPromotionRepository = new StudentPromotionRepository();
