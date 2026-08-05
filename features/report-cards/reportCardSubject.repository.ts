import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { ReportCardSubject, ECZGrade } from "@/types/prisma-enums";

/**
 * ReportCardSubject Repository - Data Access Layer
 *
 * Manages individual subject entries within report cards.
 * No business logic - pure data access.
 */
export class ReportCardSubjectRepository {
  /**
   * Create a new report card subject entry
   */
  async create(data: Prisma.ReportCardSubjectCreateInput): Promise<ReportCardSubject> {
    try {
      return await prisma.reportCardSubject.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Subject entry already exists for this report card");
        }
        if (error.code === "P2003") {
          throw new Error("Referenced report card or subject not found");
        }
      }
      throw error;
    }
  }

  /**
   * Create report card subject within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.ReportCardSubjectCreateInput
  ): Promise<ReportCardSubject> {
    return tx.reportCardSubject.create({ data });
  }

  /**
   * Find report card subject by ID
   */
  async findById(id: string): Promise<ReportCardSubject | null> {
    return prisma.reportCardSubject.findUnique({
      where: { id },
    });
  }

  /**
   * Find report card subject by ID with relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.reportCardSubject.findUnique({
      where: { id },
      include: {
        reportCard: {
          include: {
            student: true,
            term: true,
          },
        },
        subject: true,
      },
    });
  }

  /**
   * Find all report card subjects
   */
  async findAll(): Promise<ReportCardSubject[]> {
    return prisma.reportCardSubject.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subject: {
          select: {
            name: true,
            code: true,
          },
        },
        reportCard: {
          select: {
            student: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find subjects by report card
   */
  async findByReportCard(reportCardId: string): Promise<ReportCardSubject[]> {
    return prisma.reportCardSubject.findMany({
      where: { reportCardId },
      include: {
        subject: true,
      },
      orderBy: {
        subject: {
          name: "asc",
        },
      },
    });
  }

  /**
   * Find by report card and subject (unique)
   */
  async findByReportCardAndSubject(
    reportCardId: string,
    subjectId: string
  ): Promise<ReportCardSubject | null> {
    return prisma.reportCardSubject.findUnique({
      where: {
        reportCardId_subjectId: {
          reportCardId,
          subjectId,
        },
      },
    });
  }

  /**
   * Find many with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ReportCardSubjectWhereInput;
    orderBy?: Prisma.ReportCardSubjectOrderByWithRelationInput;
    include?: Prisma.ReportCardSubjectInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;

    return prisma.reportCardSubject.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || { createdAt: "desc" },
      include: include || {
        subject: true,
        reportCard: true,
      },
    });
  }

  /**
   * Count report card subjects
   */
  async count(where?: Prisma.ReportCardSubjectWhereInput): Promise<number> {
    return prisma.reportCardSubject.count({ where });
  }

  /**
   * Update report card subject
   */
  async update(
    id: string,
    data: Prisma.ReportCardSubjectUpdateInput
  ): Promise<ReportCardSubject> {
    try {
      return await prisma.reportCardSubject.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Report card subject not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete report card subject
   */
  async delete(id: string): Promise<ReportCardSubject> {
    try {
      return await prisma.reportCardSubject.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Report card subject not found");
        }
      }
      throw error;
    }
  }

  /**
   * Bulk create report card subjects
   */
  async bulkCreate(
    data: Prisma.ReportCardSubjectCreateManyInput[]
  ): Promise<Prisma.BatchPayload> {
    return prisma.reportCardSubject.createMany({
      data,
      skipDuplicates: true,
    });
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
export const reportCardSubjectRepository = new ReportCardSubjectRepository();
