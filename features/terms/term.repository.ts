import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { Term, TermType } from "@/types/prisma-enums";

/**
 * Term Repository - Data Access Layer
 *
 * Manages academic terms within academic years.
 * Terms are TERM_1, TERM_2, TERM_3 in Zambian school system.
 */
export class TermRepository {
  /**
   * Create a new term
   */
  async create(data: Prisma.TermCreateInput): Promise<Term> {
    try {
      return await prisma.term.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Term already exists for this academic year");
        }
      }
      throw error;
    }
  }

  /**
   * Create term within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.TermCreateInput
  ): Promise<Term> {
    return tx.term.create({ data });
  }

  /**
   * Find term by ID
   */
  async findById(id: string): Promise<Term | null> {
    return prisma.term.findUnique({
      where: { id },
    });
  }

  /**
   * Find term by ID within transaction
   */
  async findByIdInTransaction(
    tx: Prisma.TransactionClient,
    id: string
  ): Promise<Term | null> {
    return tx.term.findUnique({
      where: { id },
    });
  }

  /**
   * Find term with all relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.term.findUnique({
      where: { id },
      include: {
        academicYear: true,
        assessments: {
          include: {
            subject: true,
            class: {
              include: { grade: true },
            },
          },
        },
        reportCards: {
          include: {
            student: true,
            class: true,
          },
        },
        _count: {
          select: {
            assessments: true,
            attendanceRecords: true,
            reportCards: true,
          },
        },
      },
    });
  }

  /**
   * Find term by academic year and type
   */
  async findByYearAndType(
    academicYearId: string,
    termType: TermType
  ): Promise<Term | null> {
    return prisma.term.findUnique({
      where: {
        academicYearId_termType: {
          academicYearId,
          termType,
        },
      },
      include: {
        academicYear: true,
      },
    });
  }

  /**
   * Find all terms for an academic year
   */
  async findByAcademicYear(academicYearId: string): Promise<Term[]> {
    return prisma.term.findMany({
      where: { academicYearId },
      orderBy: { startDate: "asc" },
      include: {
        _count: {
          select: {
            assessments: true,
            reportCards: true,
          },
        },
      },
    });
  }

  /**
   * Find the currently active term
   */
  async findActive(): Promise<Prisma.TermGetPayload<{ include: { academicYear: true } }> | null> {
    return prisma.term.findFirst({
      where: { isActive: true },
      include: {
        academicYear: true,
      },
    });
  }

  /**
   * Find active term within transaction
   */
  async findActiveInTransaction(
    tx: Prisma.TransactionClient
  ): Promise<Term | null> {
    return tx.term.findFirst({
      where: { isActive: true },
      include: {
        academicYear: true,
      },
    });
  }

  /**
   * Find active term for an academic year
   */
  async findActiveByAcademicYear(academicYearId: string): Promise<Term | null> {
    return prisma.term.findFirst({
      where: {
        academicYearId,
        isActive: true,
      },
    });
  }

  /**
   * Find term by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Term[]> {
    return prisma.term.findMany({
      where: {
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
      include: {
        academicYear: true,
      },
      orderBy: { startDate: "asc" },
    });
  }

  /**
   * Find current term based on today's date
   */
  async findCurrentByDate(): Promise<Term | null> {
    const today = new Date();
    return prisma.term.findFirst({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
      },
      include: {
        academicYear: true,
      },
    });
  }

  /**
   * Find all terms
   */
  async findMany(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.TermWhereInput;
    orderBy?: Prisma.TermOrderByWithRelationInput;
    include?: Prisma.TermInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params || {};

    return prisma.term.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || { startDate: "desc" },
      include,
    });
  }

  /**
   * Find every term (no pagination cap), with academic year, newest first —
   * for report-filter dropdowns where the full list is expected.
   */
  async findAllWithAcademicYear() {
    return prisma.term.findMany({
      include: { academicYear: { select: { year: true, isActive: true } } },
      orderBy: [{ academicYear: { year: "desc" } }, { termType: "asc" }],
    });
  }

  /**
   * Find terms by type
   */
  async findByType(termType: TermType): Promise<Term[]> {
    return prisma.term.findMany({
      where: { termType },
      include: {
        academicYear: true,
      },
      orderBy: { startDate: "desc" },
    });
  }

  /**
   * Count terms
   */
  async count(where?: Prisma.TermWhereInput): Promise<number> {
    return prisma.term.count({ where });
  }

  /**
   * Update term
   */
  async update(id: string, data: Prisma.TermUpdateInput): Promise<Term> {
    try {
      return await prisma.term.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Term not found");
        }
      }
      throw error;
    }
  }

  /**
   * Update term within transaction
   */
  async updateInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    data: Prisma.TermUpdateInput
  ): Promise<Term> {
    return tx.term.update({
      where: { id },
      data,
    });
  }

  /**
   * Set term as active (deactivates others in same academic year)
   */
  async setActive(id: string): Promise<Term> {
    return prisma.$transaction(async (tx) => {
      // Get the term to find its academic year
      const term = await tx.term.findUnique({
        where: { id },
        select: { academicYearId: true },
      });

      if (!term) {
        throw new Error("Term not found");
      }

      // Deactivate all terms in the same academic year
      await tx.term.updateMany({
        where: {
          academicYearId: term.academicYearId,
          isActive: true,
        },
        data: { isActive: false },
      });

      // Activate the specified term
      return tx.term.update({
        where: { id },
        data: { isActive: true },
      });
    });
  }

  /**
   * Deactivate term
   */
  async deactivate(id: string): Promise<Term> {
    return this.update(id, { isActive: false });
  }

  /**
   * Check if term dates overlap with existing terms
   */
  async checkOverlap(
    academicYearId: string,
    startDate: Date,
    endDate: Date,
    excludeTermId?: string
  ): Promise<boolean> {
    const overlapping = await prisma.term.findFirst({
      where: {
        academicYearId,
        ...(excludeTermId && { id: { not: excludeTermId } }),
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
    });

    return overlapping !== null;
  }

  /**
   * Delete term
   */
  async delete(id: string): Promise<Term> {
    try {
      return await prisma.term.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Term not found");
        }
        if (error.code === "P2003") {
          throw new Error(
            "Cannot delete term with existing assessments or report cards"
          );
        }
      }
      throw error;
    }
  }

  /**
   * Get term statistics
   */
  async getStatistics(id: string) {
    return prisma.term.findUnique({
      where: { id },
      include: {
        academicYear: true,
        _count: {
          select: {
            assessments: true,
            attendanceRecords: true,
            reportCards: true,
          },
        },
      },
    });
  }

  /**
   * Get term progress (percentage of term completed)
   */
  async getProgress(id: string): Promise<number | null> {
    const term = await this.findById(id);
    if (!term) return null;

    const now = new Date();
    const start = term.startDate.getTime();
    const end = term.endDate.getTime();
    const current = now.getTime();

    if (current < start) return 0;
    if (current > end) return 100;

    return ((current - start) / (end - start)) * 100;
  }

  /**
   * Create all terms for an academic year
   */
  async createAllForYear(
    academicYearId: string,
    termDates: {
      term1: { startDate: Date; endDate: Date };
      term2: { startDate: Date; endDate: Date };
      term3: { startDate: Date; endDate: Date };
    }
  ): Promise<Term[]> {
    return prisma.$transaction([
      prisma.term.create({
        data: {
          academicYearId,
          termType: "TERM_1",
          startDate: termDates.term1.startDate,
          endDate: termDates.term1.endDate,
          isActive: false,
        },
      }),
      prisma.term.create({
        data: {
          academicYearId,
          termType: "TERM_2",
          startDate: termDates.term2.startDate,
          endDate: termDates.term2.endDate,
          isActive: false,
        },
      }),
      prisma.term.create({
        data: {
          academicYearId,
          termType: "TERM_3",
          startDate: termDates.term3.startDate,
          endDate: termDates.term3.endDate,
          isActive: false,
        },
      }),
    ]);
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
export const termRepository = new TermRepository();
