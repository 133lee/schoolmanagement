import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { TimetableConfiguration } from "@/types/prisma-enums";

/**
 * TimetableConfiguration Repository - Data Access Layer
 *
 * Manages timetable configuration settings.
 * No business logic - pure data access.
 */
export class TimetableConfigurationRepository {
  /**
   * Create a new timetable configuration
   */
  async create(
    data: Prisma.TimetableConfigurationCreateInput
  ): Promise<TimetableConfiguration> {
    try {
      return await prisma.timetableConfiguration.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error(
            "A timetable configuration already exists for this academic year"
          );
        }
        if (error.code === "P2003") {
          throw new Error("Referenced academic year or term not found");
        }
      }
      throw error;
    }
  }

  /**
   * Create configuration within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.TimetableConfigurationCreateInput
  ): Promise<TimetableConfiguration> {
    return tx.timetableConfiguration.create({ data });
  }

  /**
   * Find configuration by ID
   */
  async findById(id: string): Promise<TimetableConfiguration | null> {
    return prisma.timetableConfiguration.findUnique({
      where: { id },
    });
  }

  /**
   * Find configuration by ID with relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.timetableConfiguration.findUnique({
      where: { id },
      include: {
        academicYear: {
          select: {
            id: true,
            year: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
        },
        term: {
          select: {
            id: true,
            termType: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * Find configuration by academic year ID
   */
  async findByAcademicYearId(
    academicYearId: string
  ): Promise<TimetableConfiguration | null> {
    return prisma.timetableConfiguration.findUnique({
      where: { academicYearId },
    });
  }

  /**
   * Find configuration by academic year ID with relations
   */
  async findByAcademicYearIdWithRelations(academicYearId: string) {
    return prisma.timetableConfiguration.findUnique({
      where: { academicYearId },
      include: {
        academicYear: {
          select: {
            id: true,
            year: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
        },
        term: {
          select: {
            id: true,
            termType: true,
            startDate: true,
            endDate: true,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * Find all configurations
   */
  async findAll(): Promise<TimetableConfiguration[]> {
    return prisma.timetableConfiguration.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        academicYear: {
          select: {
            year: true,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * Find configuration for active academic year
   */
  async findForActiveAcademicYear(): Promise<TimetableConfiguration | null> {
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!activeYear) {
      return null;
    }

    return this.findByAcademicYearId(activeYear.id);
  }

  /**
   * Find configuration for active academic year with relations
   */
  async findForActiveAcademicYearWithRelations() {
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!activeYear) {
      return null;
    }

    return this.findByAcademicYearIdWithRelations(activeYear.id);
  }

  /**
   * Find many with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.TimetableConfigurationWhereInput;
    orderBy?: Prisma.TimetableConfigurationOrderByWithRelationInput;
    include?: Prisma.TimetableConfigurationInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;

    return prisma.timetableConfiguration.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || { createdAt: "desc" },
      include,
    });
  }

  /**
   * Count configurations
   */
  async count(
    where?: Prisma.TimetableConfigurationWhereInput
  ): Promise<number> {
    return prisma.timetableConfiguration.count({ where });
  }

  /**
   * Update configuration
   */
  async update(
    id: string,
    data: Prisma.TimetableConfigurationUpdateInput
  ): Promise<TimetableConfiguration> {
    try {
      return await prisma.timetableConfiguration.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Timetable configuration not found");
        }
        if (error.code === "P2002") {
          throw new Error(
            "A timetable configuration already exists for this academic year"
          );
        }
      }
      throw error;
    }
  }

  /**
   * Update configuration by academic year ID
   */
  async updateByAcademicYearId(
    academicYearId: string,
    data: Prisma.TimetableConfigurationUpdateInput
  ): Promise<TimetableConfiguration> {
    try {
      return await prisma.timetableConfiguration.update({
        where: { academicYearId },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Timetable configuration not found");
        }
      }
      throw error;
    }
  }

  /**
   * Upsert configuration (create or update)
   */
  async upsert(
    academicYearId: string,
    createData: Prisma.TimetableConfigurationCreateInput,
    updateData: Prisma.TimetableConfigurationUpdateInput
  ): Promise<TimetableConfiguration> {
    return prisma.timetableConfiguration.upsert({
      where: { academicYearId },
      create: createData,
      update: updateData,
    });
  }

  /**
   * Delete configuration
   */
  async delete(id: string): Promise<TimetableConfiguration> {
    try {
      return await prisma.timetableConfiguration.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Timetable configuration not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete configuration by academic year ID
   */
  async deleteByAcademicYearId(
    academicYearId: string
  ): Promise<TimetableConfiguration> {
    try {
      return await prisma.timetableConfiguration.delete({
        where: { academicYearId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Timetable configuration not found");
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
export const timetableConfigurationRepository =
  new TimetableConfigurationRepository();
