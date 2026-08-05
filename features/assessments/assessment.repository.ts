import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { Assessment, ExamType, AssessmentStatus } from "@/types/prisma-enums";

/**
 * Assessment Repository - Data Access Layer
 *
 * Manages exams and tests (CAT, MID, EOT).
 * No business logic - pure data access.
 */
export class AssessmentRepository {
  /**
   * Create a new assessment
   */
  async create(data: Prisma.AssessmentCreateInput): Promise<Assessment> {
    try {
      return await prisma.assessment.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new Error("Referenced subject, class, or term not found");
        }
      }
      throw error;
    }
  }

  /**
   * Create assessment within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.AssessmentCreateInput
  ): Promise<Assessment> {
    return tx.assessment.create({ data });
  }

  /**
   * Find assessment by ID
   */
  async findById(id: string): Promise<Assessment | null> {
    return prisma.assessment.findUnique({
      where: { id },
    });
  }

  /**
   * Find assessment by ID with relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.assessment.findUnique({
      where: { id },
      include: {
        subject: true,
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
        results: {
          include: {
            student: true,
          },
        },
        _count: {
          select: {
            results: true,
          },
        },
      },
    });
  }

  /**
   * Find all assessments
   */
  async findAll(): Promise<Assessment[]> {
    return prisma.assessment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subject: {
          select: {
            name: true,
            code: true,
          },
        },
        class: {
          select: {
            name: true,
            grade: {
              select: {
                name: true,
              },
            },
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
   * Find assessments by class
   */
  async findByClass(classId: string): Promise<Assessment[]> {
    return prisma.assessment.findMany({
      where: { classId },
      orderBy: { assessmentDate: "desc" },
      include: {
        subject: true,
        term: {
          include: {
            academicYear: true,
          },
        },
      },
    });
  }

  /**
   * Find assessments by subject
   */
  async findBySubject(subjectId: string): Promise<Assessment[]> {
    return prisma.assessment.findMany({
      where: { subjectId },
      orderBy: { assessmentDate: "desc" },
      include: {
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
      },
    });
  }

  /**
   * Find assessments by term
   */
  async findByTerm(termId: string): Promise<Assessment[]> {
    return prisma.assessment.findMany({
      where: { termId },
      orderBy: { assessmentDate: "asc" },
      include: {
        subject: true,
        class: {
          include: {
            grade: true,
          },
        },
      },
    });
  }

  /**
   * Find assessments by exam type
   */
  async findByType(examType: ExamType): Promise<Assessment[]> {
    return prisma.assessment.findMany({
      where: { examType },
      orderBy: { assessmentDate: "desc" },
      include: {
        subject: true,
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
      },
    });
  }

  /**
   * Find assessments by status
   */
  async findByStatus(status: AssessmentStatus): Promise<Assessment[]> {
    return prisma.assessment.findMany({
      where: { status },
      orderBy: { assessmentDate: "desc" },
      include: {
        subject: true,
        class: {
          include: {
            grade: true,
          },
        },
        term: true,
      },
    });
  }

  /**
   * Find assessments by term and class
   */
  async findByTermAndClass(termId: string, classId: string): Promise<Assessment[]> {
    return prisma.assessment.findMany({
      where: {
        termId,
        classId,
      },
      orderBy: { assessmentDate: "asc" },
      include: {
        subject: true,
      },
    });
  }

  /**
   * Find many with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.AssessmentWhereInput;
    orderBy?: Prisma.AssessmentOrderByWithRelationInput;
    include?: Prisma.AssessmentInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;

    return prisma.assessment.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || { assessmentDate: "desc" },
      include: include || {
        subject: true,
        class: {
          include: {
            grade: true,
          },
        },
        term: true,
      },
    });
  }

  /**
   * Count assessments
   */
  async count(where?: Prisma.AssessmentWhereInput): Promise<number> {
    return prisma.assessment.count({ where });
  }

  /**
   * Update assessment
   */
  async update(
    id: string,
    data: Prisma.AssessmentUpdateInput
  ): Promise<Assessment> {
    try {
      return await prisma.assessment.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Assessment not found");
        }
      }
      throw error;
    }
  }

  /**
   * Update assessment status
   */
  async updateStatus(
    id: string,
    status: AssessmentStatus
  ): Promise<Assessment> {
    return this.update(id, { status });
  }

  /**
   * Delete assessment
   */
  async delete(id: string): Promise<Assessment> {
    try {
      return await prisma.assessment.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Assessment not found");
        }
        if (error.code === "P2003") {
          throw new Error("Cannot delete assessment with existing results");
        }
      }
      throw error;
    }
  }

  /**
   * Get result count for assessment
   */
  async getResultCount(assessmentId: string): Promise<number> {
    return prisma.studentAssessmentResult.count({
      where: { assessmentId },
    });
  }

  /**
   * Check if assessment has results
   */
  async hasResults(assessmentId: string): Promise<boolean> {
    const count = await this.getResultCount(assessmentId);
    return count > 0;
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
export const assessmentRepository = new AssessmentRepository();
