import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { Grade, GradeLevel, SchoolLevel } from "@/types/prisma-enums";

/**
 * Grade Repository - Data Access Layer
 *
 * Manages grade levels (Grade 1-12, Forms 1-5).
 * Handles grade progression, school level filtering, and subject assignments.
 */
export class GradeRepository {
  /**
   * Create a new grade level
   */
  async create(data: Prisma.GradeCreateInput): Promise<Grade> {
    try {
      return await prisma.grade.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Grade level already exists");
        }
      }
      throw error;
    }
  }

  /**
   * Idempotently create a grade level for a level that doesn't exist yet
   * (no-op update on conflict). Used by the default-grades seeding utility.
   */
  async upsertByLevel(data: Prisma.GradeCreateInput): Promise<Grade> {
    return prisma.grade.upsert({
      where: { level: data.level },
      update: {},
      create: data,
    });
  }

  /**
   * Find all grade levels
   */
  async findAll(): Promise<Grade[]> {
    return prisma.grade.findMany({
      orderBy: { sequence: "asc" },
    });
  }

  /**
   * Find grade by ID
   */
  async findById(id: string): Promise<Grade | null> {
    return prisma.grade.findUnique({
      where: { id },
    });
  }

  /**
   * Find grade by ID with relations (classes, subjects, progression)
   */
  async findByIdWithRelations(id: string) {
    return prisma.grade.findUnique({
      where: { id },
      include: {
        classes: {
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
        },
        subjects: {
          include: {
            subject: true,
          },
          orderBy: {
            subject: { name: "asc" },
          },
        },
        nextGrade: true,
        previousGrades: true,
      },
    });
  }

  /**
   * Find grade by level (e.g., GRADE_1, GRADE_8)
   */
  async findByLevel(level: GradeLevel): Promise<Grade | null> {
    return prisma.grade.findUnique({
      where: { level },
    });
  }

  /**
   * Find grades by school level (PRIMARY or SECONDARY)
   */
  async findBySchoolLevel(schoolLevel: SchoolLevel): Promise<Grade[]> {
    return prisma.grade.findMany({
      where: { schoolLevel },
      orderBy: { sequence: "asc" },
    });
  }

  /**
   * Find grade with progression info (next and previous grades)
   */
  async findWithProgression(id: string) {
    return prisma.grade.findUnique({
      where: { id },
      include: {
        nextGrade: {
          select: {
            id: true,
            level: true,
            name: true,
            sequence: true,
          },
        },
        previousGrades: {
          select: {
            id: true,
            level: true,
            name: true,
            sequence: true,
          },
        },
      },
    });
  }

  /**
   * Find many grades with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.GradeWhereInput;
    orderBy?: Prisma.GradeOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return prisma.grade.findMany({
      skip,
      take,
      where,
      orderBy: orderBy || { sequence: "asc" },
      include: {
        _count: {
          select: {
            classes: true,
            subjects: true,
          },
        },
      },
    });
  }

  /**
   * Count grades
   */
  async count(where?: Prisma.GradeWhereInput): Promise<number> {
    return prisma.grade.count({ where });
  }

  /**
   * Update grade
   */
  async update(id: string, data: Prisma.GradeUpdateInput): Promise<Grade> {
    try {
      return await prisma.grade.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Grade not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete grade (hard delete)
   */
  async delete(id: string): Promise<Grade> {
    try {
      return await prisma.grade.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Grade not found");
        }
        if (error.code === "P2003") {
          throw new Error("Cannot delete grade with existing classes");
        }
      }
      throw error;
    }
  }

  /**
   * Check if grade exists by level
   */
  async existsByLevel(level: GradeLevel): Promise<boolean> {
    const count = await prisma.grade.count({
      where: { level },
    });
    return count > 0;
  }

  /**
   * Get next grade in sequence
   */
  async getNextGrade(currentGradeId: string): Promise<Grade | null> {
    const currentGrade = await this.findById(currentGradeId);
    if (!currentGrade) return null;

    return prisma.grade.findFirst({
      where: {
        sequence: currentGrade.sequence + 1,
      },
    });
  }

  /**
   * Get previous grade in sequence
   */
  async getPreviousGrade(currentGradeId: string): Promise<Grade | null> {
    const currentGrade = await this.findById(currentGradeId);
    if (!currentGrade) return null;

    return prisma.grade.findFirst({
      where: {
        sequence: currentGrade.sequence - 1,
      },
    });
  }

  /**
   * Get all subjects assigned to a grade
   */
  async getGradeSubjects(gradeId: string) {
    return prisma.gradeSubject.findMany({
      where: { gradeId },
      include: {
        subject: true,
      },
      orderBy: {
        subject: { name: "asc" },
      },
    });
  }

  /**
   * Get count of classes in a grade
   */
  async getClassCount(gradeId: string): Promise<number> {
    return prisma.class.count({
      where: { gradeId },
    });
  }

  /**
   * Get count of subjects assigned to a grade
   */
  async getSubjectCount(gradeId: string): Promise<number> {
    return prisma.gradeSubject.count({
      where: { gradeId },
    });
  }

  /**
   * Check if grade is the last in sequence (for graduation)
   */
  async isLastGrade(gradeId: string): Promise<boolean> {
    const grade = await this.findById(gradeId);
    if (!grade) return false;

    const nextGrade = await this.getNextGrade(gradeId);
    return nextGrade === null;
  }

  /**
   * Check if grade is the first in sequence
   */
  async isFirstGrade(gradeId: string): Promise<boolean> {
    const grade = await this.findById(gradeId);
    if (!grade) return false;

    return grade.sequence === 1;
  }

  /**
   * Get grades by sequence range
   */
  async findBySequenceRange(minSequence: number, maxSequence: number): Promise<Grade[]> {
    return prisma.grade.findMany({
      where: {
        sequence: {
          gte: minSequence,
          lte: maxSequence,
        },
      },
      orderBy: { sequence: "asc" },
    });
  }
}

// Singleton instance
export const gradeRepository = new GradeRepository();
