import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { AcademicYear } from "@/types/prisma-enums";

/**
 * Academic Year Repository - Data Access Layer
 *
 * Manages academic years and their lifecycle.
 * Critical for all time-based operations in the system.
 */
export class AcademicYearRepository {
  /**
   * Create a new academic year
   */
  async create(data: Prisma.AcademicYearCreateInput): Promise<AcademicYear> {
    try {
      return await prisma.academicYear.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Academic year already exists");
        }
      }
      throw error;
    }
  }

  /**
   * Create academic year within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.AcademicYearCreateInput
  ): Promise<AcademicYear> {
    return tx.academicYear.create({ data });
  }

  /**
   * Find academic year by ID
   */
  async findById(id: string): Promise<AcademicYear | null> {
    return prisma.academicYear.findUnique({
      where: { id },
    });
  }

  /**
   * Find academic year by ID within transaction
   */
  async findByIdInTransaction(
    tx: Prisma.TransactionClient,
    id: string
  ): Promise<AcademicYear | null> {
    return tx.academicYear.findUnique({
      where: { id },
    });
  }

  /**
   * Find academic year by year number
   */
  async findByYear(year: number): Promise<AcademicYear | null> {
    return prisma.academicYear.findUnique({
      where: { year },
    });
  }

  /**
   * Find academic year with all relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.academicYear.findUnique({
      where: { id },
      include: {
        terms: {
          orderBy: { startDate: "asc" },
        },
        enrollments: {
          include: {
            student: true,
            class: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            terms: true,
            classTeacherAssignments: true,
            subjectTeacherAssignments: true,
          },
        },
      },
    });
  }

  /**
   * Find the currently active academic year
   */
  async findActive(): Promise<AcademicYear | null> {
    return prisma.academicYear.findFirst({
      where: { isActive: true },
    });
  }

  /**
   * Find active academic year within transaction
   */
  async findActiveInTransaction(
    tx: Prisma.TransactionClient
  ): Promise<AcademicYear | null> {
    return tx.academicYear.findFirst({
      where: { isActive: true },
    });
  }

  /**
   * Check if academic year is active and open for operations
   */
  async isActiveAndOpen(
    id: string,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = tx || prisma;
    const year = await client.academicYear.findUnique({
      where: { id },
      select: { isActive: true, isClosed: true },
    });
    return year?.isActive === true && year?.isClosed === false;
  }

  /**
   * Find all academic years
   */
  async findMany(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.AcademicYearWhereInput;
    orderBy?: Prisma.AcademicYearOrderByWithRelationInput;
    include?: Prisma.AcademicYearInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params || {};

    return prisma.academicYear.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || { year: "desc" },
      include,
    });
  }

  /**
   * Find academic years by status
   */
  async findByStatus(isActive: boolean, isClosed?: boolean) {
    return prisma.academicYear.findMany({
      where: {
        isActive,
        ...(isClosed !== undefined && { isClosed }),
      },
      orderBy: { year: "desc" },
    });
  }

  /**
   * Count academic years
   */
  async count(where?: Prisma.AcademicYearWhereInput): Promise<number> {
    return prisma.academicYear.count({ where });
  }

  /**
   * Update academic year
   */
  async update(
    id: string,
    data: Prisma.AcademicYearUpdateInput
  ): Promise<AcademicYear> {
    try {
      return await prisma.academicYear.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Academic year not found");
        }
      }
      throw error;
    }
  }

  /**
   * Update academic year within transaction
   */
  async updateInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    data: Prisma.AcademicYearUpdateInput
  ): Promise<AcademicYear> {
    return tx.academicYear.update({
      where: { id },
      data,
    });
  }

  /**
   * Set academic year as active (deactivates others)
   */
  async setActive(id: string): Promise<AcademicYear> {
    return prisma.$transaction(async (tx) => {
      // Deactivate all other years
      await tx.academicYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Activate the specified year
      return tx.academicYear.update({
        where: { id },
        data: { isActive: true },
      });
    });
  }

  /**
   * Close academic year (prevents further modifications)
   */
  async close(id: string): Promise<AcademicYear> {
    return this.update(id, {
      isClosed: true,
      isActive: false,
    });
  }

  /**
   * Reopen closed academic year
   */
  async reopen(id: string): Promise<AcademicYear> {
    return this.update(id, {
      isClosed: false,
    });
  }

  /**
   * Delete academic year
   */
  async delete(id: string): Promise<AcademicYear> {
    try {
      return await prisma.academicYear.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Academic year not found");
        }
        if (error.code === "P2003") {
          throw new Error(
            "Cannot delete academic year with existing enrollments"
          );
        }
      }
      throw error;
    }
  }

  /**
   * Get academic year statistics
   */
  async getStatistics(id: string) {
    const year = await prisma.academicYear.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true,
            terms: true,
            classTeacherAssignments: true,
            subjectTeacherAssignments: true,
            classTimetables: true,
            secondaryTimetables: true,
            reportCards: true,
          },
        },
      },
    });

    return year;
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
export const academicYearRepository = new AcademicYearRepository();
