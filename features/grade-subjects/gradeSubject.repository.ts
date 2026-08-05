import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { GradeSubject } from "@/types/prisma-enums";

/**
 * GradeSubject Repository - Data Access Layer
 *
 * Manages grade-subject curriculum assignments (which subjects are taught in which grades).
 * No business logic - pure data access.
 */
export class GradeSubjectRepository {
  /**
   * Create a new grade-subject association
   */
  async create(data: Prisma.GradeSubjectCreateInput): Promise<GradeSubject> {
    try {
      return await prisma.gradeSubject.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Subject already assigned to this grade");
        }
        if (error.code === "P2003") {
          throw new Error("Referenced grade or subject not found");
        }
      }
      throw error;
    }
  }

  /**
   * Create grade-subject within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.GradeSubjectCreateInput
  ): Promise<GradeSubject> {
    return tx.gradeSubject.create({ data });
  }

  /**
   * Find grade-subject by ID
   */
  async findById(id: string): Promise<GradeSubject | null> {
    return prisma.gradeSubject.findUnique({
      where: { id },
    });
  }

  /**
   * Find grade-subject by ID with relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.gradeSubject.findUnique({
      where: { id },
      include: {
        grade: true,
        subject: true,
      },
    });
  }

  /**
   * Find all grade-subject associations
   */
  async findAll(): Promise<GradeSubject[]> {
    return prisma.gradeSubject.findMany({
      include: {
        grade: {
          select: {
            name: true,
            level: true,
          },
        },
        subject: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        {
          grade: {
            sequence: "asc",
          },
        },
        {
          subject: {
            name: "asc",
          },
        },
      ],
    });
  }

  /**
   * Find subjects by grade
   */
  async findByGrade(gradeId: string): Promise<GradeSubject[]> {
    return prisma.gradeSubject.findMany({
      where: { gradeId },
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
   * Find core subjects by grade
   */
  async findCoreByGrade(gradeId: string): Promise<GradeSubject[]> {
    return prisma.gradeSubject.findMany({
      where: {
        gradeId,
        isCore: true,
      },
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
   * Find optional subjects by grade
   */
  async findOptionalByGrade(gradeId: string): Promise<GradeSubject[]> {
    return prisma.gradeSubject.findMany({
      where: {
        gradeId,
        isCore: false,
      },
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
   * Find grades by subject
   */
  async findBySubject(subjectId: string): Promise<GradeSubject[]> {
    return prisma.gradeSubject.findMany({
      where: { subjectId },
      include: {
        grade: true,
      },
      orderBy: {
        grade: {
          sequence: "asc",
        },
      },
    });
  }

  /**
   * Find by grade and subject (unique)
   */
  async findByGradeAndSubject(
    gradeId: string,
    subjectId: string
  ): Promise<GradeSubject | null> {
    return prisma.gradeSubject.findUnique({
      where: {
        gradeId_subjectId: {
          gradeId,
          subjectId,
        },
      },
    });
  }

  /**
   * Check if subject is taught in grade
   */
  async isTaughtInGrade(gradeId: string, subjectId: string): Promise<boolean> {
    const result = await this.findByGradeAndSubject(gradeId, subjectId);
    return result !== null;
  }

  /**
   * Check if subject is core in grade
   */
  async isCoreInGrade(gradeId: string, subjectId: string): Promise<boolean> {
    const result = await this.findByGradeAndSubject(gradeId, subjectId);
    return result !== null && result.isCore;
  }

  /**
   * Find many with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.GradeSubjectWhereInput;
    orderBy?: Prisma.GradeSubjectOrderByWithRelationInput;
    include?: Prisma.GradeSubjectInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;

    return prisma.gradeSubject.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || [
        {
          grade: {
            sequence: "asc",
          },
        },
        {
          subject: {
            name: "asc",
          },
        },
      ],
      include: include || {
        grade: true,
        subject: true,
      },
    });
  }

  /**
   * Count grade-subject associations
   */
  async count(where?: Prisma.GradeSubjectWhereInput): Promise<number> {
    return prisma.gradeSubject.count({ where });
  }

  /**
   * Update grade-subject
   */
  async update(
    id: string,
    data: Prisma.GradeSubjectUpdateInput
  ): Promise<GradeSubject> {
    try {
      return await prisma.gradeSubject.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Grade-subject association not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete grade-subject
   */
  async delete(id: string): Promise<GradeSubject> {
    try {
      return await prisma.gradeSubject.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Grade-subject association not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete by grade and subject
   */
  async deleteByGradeAndSubject(
    gradeId: string,
    subjectId: string
  ): Promise<GradeSubject> {
    try {
      return await prisma.gradeSubject.delete({
        where: {
          gradeId_subjectId: {
            gradeId,
            subjectId,
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Grade-subject association not found");
        }
      }
      throw error;
    }
  }

  /**
   * Bulk create grade-subject associations
   */
  async bulkCreate(
    data: Prisma.GradeSubjectCreateManyInput[]
  ): Promise<Prisma.BatchPayload> {
    return prisma.gradeSubject.createMany({
      data,
      skipDuplicates: true,
    });
  }

  /**
   * Delete all subjects for a grade
   */
  async deleteByGrade(gradeId: string): Promise<Prisma.BatchPayload> {
    return prisma.gradeSubject.deleteMany({
      where: { gradeId },
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
export const gradeSubjectRepository = new GradeSubjectRepository();
