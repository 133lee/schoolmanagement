import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { SubjectTeacherAssignment } from "@/types/prisma-enums";

/**
 * SubjectTeacherAssignment Repository - Data Access Layer
 *
 * Manages the critical relationship: which teacher teaches what subject to which class.
 * This is essential for timetabling, assessment creation, and gradebook functionality.
 */
export class SubjectTeacherAssignmentRepository {
  /**
   * Create a new assignment
   */
  async create(
    data: Prisma.SubjectTeacherAssignmentCreateInput
  ): Promise<SubjectTeacherAssignment> {
    try {
      return await prisma.subjectTeacherAssignment.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error(
            "This teacher is already assigned to this subject for this class"
          );
        }
        if (error.code === "P2003") {
          throw new Error("Referenced teacher, subject, class, or academic year not found");
        }
      }
      throw error;
    }
  }

  /**
   * Create assignment within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.SubjectTeacherAssignmentCreateInput
  ): Promise<SubjectTeacherAssignment> {
    return tx.subjectTeacherAssignment.create({ data });
  }

  /**
   * Find assignment by ID
   */
  async findById(id: string): Promise<SubjectTeacherAssignment | null> {
    return prisma.subjectTeacherAssignment.findUnique({
      where: { id },
    });
  }

  /**
   * Find assignment with relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.subjectTeacherAssignment.findUnique({
      where: { id },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        subject: true,
        class: {
          include: {
            grade: true,
          },
        },
        academicYear: true,
      },
    });
  }

  /**
   * Find assignment by unique composite key
   */
  async findByComposite(
    teacherId: string,
    subjectId: string,
    classId: string,
    academicYearId: string
  ): Promise<SubjectTeacherAssignment | null> {
    return prisma.subjectTeacherAssignment.findUnique({
      where: {
        teacherId_subjectId_classId_academicYearId: {
          teacherId,
          subjectId,
          classId,
          academicYearId,
        },
      },
    });
  }

  /**
   * Find every teacher assigned to teach a subject to a class in a given year
   */
  async findManyBySubjectClassAndYear(
    subjectId: string,
    classId: string,
    academicYearId: string
  ) {
    return prisma.subjectTeacherAssignment.findMany({
      where: { subjectId, classId, academicYearId },
      include: { teacher: true },
    });
  }

  /**
   * Find all assignments for a teacher
   */
  async findByTeacher(
    teacherId: string,
    academicYearId?: string
  ): Promise<SubjectTeacherAssignment[]> {
    return prisma.subjectTeacherAssignment.findMany({
      where: {
        teacherId,
        ...(academicYearId && { academicYearId }),
      },
      include: {
        subject: true,
        class: {
          include: {
            grade: true,
          },
        },
        academicYear: true,
      },
      orderBy: [{ class: { grade: { sequence: "asc" } } }, { subject: { name: "asc" } }],
    });
  }

  /**
   * Find all assignments for a class
   */
  async findByClass(
    classId: string,
    academicYearId?: string
  ): Promise<SubjectTeacherAssignment[]> {
    return prisma.subjectTeacherAssignment.findMany({
      where: {
        classId,
        ...(academicYearId && { academicYearId }),
      },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        subject: true,
        academicYear: true,
      },
      orderBy: { subject: { name: "asc" } },
    });
  }

  /**
   * Find all assignments for a subject
   */
  async findBySubject(
    subjectId: string,
    academicYearId?: string
  ): Promise<SubjectTeacherAssignment[]> {
    return prisma.subjectTeacherAssignment.findMany({
      where: {
        subjectId,
        ...(academicYearId && { academicYearId }),
      },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        class: {
          include: {
            grade: true,
          },
        },
        academicYear: true,
      },
      orderBy: { class: { grade: { sequence: "asc" } } },
    });
  }

  /**
   * Find all assignments for an academic year
   */
  async findByAcademicYear(
    academicYearId: string
  ): Promise<SubjectTeacherAssignment[]> {
    return prisma.subjectTeacherAssignment.findMany({
      where: { academicYearId },
      include: {
        teacher: {
          include: {
            user: true,
          },
        },
        subject: true,
        class: {
          include: {
            grade: true,
          },
        },
      },
      orderBy: [
        { class: { grade: { sequence: "asc" } } },
        { class: { name: "asc" } },
        { subject: { name: "asc" } },
      ],
    });
  }

  /**
   * Find all assignments with filters
   */
  async findMany(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.SubjectTeacherAssignmentWhereInput;
    orderBy?: Prisma.SubjectTeacherAssignmentOrderByWithRelationInput;
    include?: Prisma.SubjectTeacherAssignmentInclude;
  }) {
    const { skip = 0, take = 100, where, orderBy, include } = params || {};

    return prisma.subjectTeacherAssignment.findMany({
      skip,
      take: Math.min(take, 500),
      where,
      orderBy,
      include,
    });
  }

  /**
   * Count assignments
   */
  async count(
    where?: Prisma.SubjectTeacherAssignmentWhereInput
  ): Promise<number> {
    return prisma.subjectTeacherAssignment.count({ where });
  }

  /**
   * Count assignments for a teacher in an academic year
   */
  async countByTeacher(
    teacherId: string,
    academicYearId: string
  ): Promise<number> {
    return prisma.subjectTeacherAssignment.count({
      where: {
        teacherId,
        academicYearId,
      },
    });
  }

  /**
   * Count assignments for a class in an academic year
   */
  async countByClass(classId: string, academicYearId: string): Promise<number> {
    return prisma.subjectTeacherAssignment.count({
      where: {
        classId,
        academicYearId,
      },
    });
  }

  /**
   * Update assignment
   */
  async update(
    id: string,
    data: Prisma.SubjectTeacherAssignmentUpdateInput
  ): Promise<SubjectTeacherAssignment> {
    try {
      return await prisma.subjectTeacherAssignment.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Assignment not found");
        }
        if (error.code === "P2002") {
          throw new Error("This assignment already exists");
        }
      }
      throw error;
    }
  }

  /**
   * Delete assignment
   */
  async delete(id: string): Promise<SubjectTeacherAssignment> {
    try {
      return await prisma.subjectTeacherAssignment.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Assignment not found");
        }
        if (error.code === "P2003") {
          throw new Error(
            "Cannot delete assignment that is referenced by timetable or assessments"
          );
        }
      }
      throw error;
    }
  }

  /**
   * Delete all assignments for a class in an academic year
   */
  async deleteByClass(classId: string, academicYearId: string): Promise<number> {
    const result = await prisma.subjectTeacherAssignment.deleteMany({
      where: {
        classId,
        academicYearId,
      },
    });
    return result.count;
  }

  /**
   * Check if assignment exists
   */
  async exists(
    teacherId: string,
    subjectId: string,
    classId: string,
    academicYearId: string
  ): Promise<boolean> {
    const count = await prisma.subjectTeacherAssignment.count({
      where: {
        teacherId,
        subjectId,
        classId,
        academicYearId,
      },
    });
    return count > 0;
  }

  /**
   * Get teacher's workload summary
   */
  async getTeacherWorkload(teacherId: string, academicYearId: string) {
    const assignments = await prisma.subjectTeacherAssignment.findMany({
      where: {
        teacherId,
        academicYearId,
      },
      include: {
        subject: true,
        class: {
          include: {
            grade: true,
          },
        },
      },
    });

    const uniqueSubjects = new Set(assignments.map((a) => a.subjectId)).size;
    const uniqueClasses = new Set(assignments.map((a) => a.classId)).size;

    return {
      totalAssignments: assignments.length,
      uniqueSubjects,
      uniqueClasses,
      assignments,
    };
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
export const subjectTeacherAssignmentRepository =
  new SubjectTeacherAssignmentRepository();
