import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { TeacherSubject } from "@/types/prisma-enums";

/**
 * TeacherSubject Repository - Data Access Layer
 *
 * Manages teacher-subject qualifications/assignments.
 * No business logic - pure data access.
 */
export class TeacherSubjectRepository {
  /**
   * Create a new teacher-subject association
   */
  async create(data: Prisma.TeacherSubjectCreateInput): Promise<TeacherSubject> {
    try {
      return await prisma.teacherSubject.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Teacher already assigned to this subject");
        }
        if (error.code === "P2003") {
          throw new Error("Referenced teacher or subject not found");
        }
      }
      throw error;
    }
  }

  /**
   * Create teacher-subject within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.TeacherSubjectCreateInput
  ): Promise<TeacherSubject> {
    return tx.teacherSubject.create({ data });
  }

  /**
   * Find teacher-subject by ID
   */
  async findById(id: string): Promise<TeacherSubject | null> {
    return prisma.teacherSubject.findUnique({
      where: { id },
    });
  }

  /**
   * Find teacher-subject by ID with relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.teacherSubject.findUnique({
      where: { id },
      include: {
        teacher: true,
        subject: true,
      },
    });
  }

  /**
   * Find all teacher-subject associations
   */
  async findAll(): Promise<TeacherSubject[]> {
    return prisma.teacherSubject.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true,
            staffNumber: true,
          },
        },
        subject: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });
  }

  /**
   * Find subjects by teacher
   */
  async findByTeacher(teacherId: string): Promise<TeacherSubject[]> {
    return prisma.teacherSubject.findMany({
      where: { teacherId },
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
   * Find teachers by subject
   */
  async findBySubject(subjectId: string): Promise<TeacherSubject[]> {
    return prisma.teacherSubject.findMany({
      where: { subjectId },
      include: {
        teacher: true,
      },
      orderBy: {
        teacher: {
          lastName: "asc",
        },
      },
    });
  }

  /**
   * Find by teacher and subject (unique)
   */
  async findByTeacherAndSubject(
    teacherId: string,
    subjectId: string
  ): Promise<TeacherSubject | null> {
    return prisma.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId,
        },
      },
    });
  }

  /**
   * Check if teacher is qualified for subject
   */
  async isQualified(teacherId: string, subjectId: string): Promise<boolean> {
    const result = await this.findByTeacherAndSubject(teacherId, subjectId);
    return result !== null;
  }

  /**
   * Find many with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.TeacherSubjectWhereInput;
    orderBy?: Prisma.TeacherSubjectOrderByWithRelationInput;
    include?: Prisma.TeacherSubjectInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;

    return prisma.teacherSubject.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || { createdAt: "desc" },
      include: include || {
        teacher: true,
        subject: true,
      },
    });
  }

  /**
   * Count teacher-subject associations
   */
  async count(where?: Prisma.TeacherSubjectWhereInput): Promise<number> {
    return prisma.teacherSubject.count({ where });
  }

  /**
   * Delete teacher-subject
   */
  async delete(id: string): Promise<TeacherSubject> {
    try {
      return await prisma.teacherSubject.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Teacher-subject association not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete by teacher and subject
   */
  async deleteByTeacherAndSubject(
    teacherId: string,
    subjectId: string
  ): Promise<TeacherSubject> {
    try {
      return await prisma.teacherSubject.delete({
        where: {
          teacherId_subjectId: {
            teacherId,
            subjectId,
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Teacher-subject association not found");
        }
      }
      throw error;
    }
  }

  /**
   * Bulk create teacher-subject associations
   */
  async bulkCreate(
    data: Prisma.TeacherSubjectCreateManyInput[]
  ): Promise<Prisma.BatchPayload> {
    return prisma.teacherSubject.createMany({
      data,
      skipDuplicates: true,
    });
  }

  /**
   * Delete all subjects for a teacher
   */
  async deleteByTeacher(teacherId: string): Promise<Prisma.BatchPayload> {
    return prisma.teacherSubject.deleteMany({
      where: { teacherId },
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
export const teacherSubjectRepository = new TeacherSubjectRepository();
