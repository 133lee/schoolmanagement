import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { ReportCard, PromotionStatus } from "@/types/prisma-enums";

/**
 * ReportCard Repository - Data Access Layer
 *
 * Manages student report cards.
 * No business logic - pure data access.
 */
export class ReportCardRepository {
  /**
   * Create a new report card
   */
  async create(data: Prisma.ReportCardCreateInput): Promise<ReportCard> {
    try {
      return await prisma.reportCard.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Report card already exists for this student and term");
        }
        if (error.code === "P2003") {
          throw new Error("Referenced student, class, term, academic year, or teacher not found");
        }
      }
      throw error;
    }
  }

  /**
   * Create report card within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.ReportCardCreateInput
  ): Promise<ReportCard> {
    return tx.reportCard.create({ data });
  }

  /**
   * Find report card by ID
   */
  async findById(id: string): Promise<ReportCard | null> {
    return prisma.reportCard.findUnique({
      where: { id },
    });
  }

  /**
   * Find report card by ID with relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.reportCard.findUnique({
      where: { id },
      include: {
        student: true,
        class: {
          include: {
            grade: true,
          },
        },
        term: {
          include: {
            academicYear: true,
          },
        },
        academicYear: true,
        classTeacher: true,
        subjects: {
          include: {
            subject: {
              include: {
                gradeSubjects: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find all report cards
   */
  async findAll(): Promise<ReportCard[]> {
    return prisma.reportCard.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          select: {
            studentNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        class: {
          select: {
            name: true,
          },
        },
        term: {
          select: {
            termType: true,
          },
        },
      },
    });
  }

  /**
   * Find report cards by student
   */
  async findByStudent(studentId: string): Promise<ReportCard[]> {
    return prisma.reportCard.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      include: {
        term: {
          include: {
            academicYear: true,
          },
        },
        class: true,
        subjects: {
          include: {
            subject: true,
          },
        },
      },
    });
  }

  /**
   * Find report cards by class
   */
  async findByClass(classId: string): Promise<ReportCard[]> {
    return prisma.reportCard.findMany({
      where: { classId },
      orderBy: { createdAt: "desc" },
      include: {
        student: true,
        term: true,
      },
    });
  }

  /**
   * Find report cards by term
   */
  async findByTerm(termId: string): Promise<ReportCard[]> {
    return prisma.reportCard.findMany({
      where: { termId },
      orderBy: { createdAt: "desc" },
      include: {
        student: true,
        class: true,
      },
    });
  }

  /**
   * Find report cards by academic year
   */
  async findByAcademicYear(academicYearId: string): Promise<ReportCard[]> {
    return prisma.reportCard.findMany({
      where: { academicYearId },
      orderBy: { createdAt: "desc" },
      include: {
        student: true,
        class: true,
        term: true,
      },
    });
  }

  /**
   * Find report card by student and term (unique)
   */
  async findByStudentAndTerm(
    studentId: string,
    termId: string
  ): Promise<ReportCard | null> {
    return prisma.reportCard.findUnique({
      where: {
        studentId_termId: {
          studentId,
          termId,
        },
      },
    });
  }

  /**
   * Find report cards by promotion status
   */
  async findByPromotionStatus(status: PromotionStatus): Promise<ReportCard[]> {
    return prisma.reportCard.findMany({
      where: { promotionStatus: status },
      include: {
        student: true,
        class: true,
        term: true,
      },
    });
  }

  /**
   * Find many with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ReportCardWhereInput;
    orderBy?: Prisma.ReportCardOrderByWithRelationInput;
    include?: Prisma.ReportCardInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;

    return prisma.reportCard.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || { createdAt: "desc" },
      include: include || {
        student: true,
        class: true,
        term: true,
      },
    });
  }

  /**
   * Count report cards
   */
  async count(where?: Prisma.ReportCardWhereInput): Promise<number> {
    return prisma.reportCard.count({ where });
  }

  /**
   * Update report card
   */
  async update(
    id: string,
    data: Prisma.ReportCardUpdateInput
  ): Promise<ReportCard> {
    try {
      return await prisma.reportCard.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Report card not found");
        }
      }
      throw error;
    }
  }

  /**
   * Update report card within an existing transaction context
   */
  async updateInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    data: Prisma.ReportCardUpdateInput
  ): Promise<ReportCard> {
    return tx.reportCard.update({ where: { id }, data });
  }

  /**
   * Delete report card
   */
  async delete(id: string): Promise<ReportCard> {
    try {
      return await prisma.reportCard.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Report card not found");
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
export const reportCardRepository = new ReportCardRepository();
