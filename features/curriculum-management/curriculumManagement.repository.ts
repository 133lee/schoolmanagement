import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

/**
 * Curriculum Management Repository
 *
 * Handles CRUD operations for GradeSubject (curriculum configuration)
 * Used by Admin to define which subjects are taught in which grades
 */
export class CurriculumManagementRepository {
  /**
   * Get all subjects assigned to a grade
   */
  async findSubjectsByGrade(gradeId: string) {
    return prisma.gradeSubject.findMany({
      where: { gradeId },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            departmentId: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        grade: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
      orderBy: {
        subject: {
          name: "asc",
        },
      },
    });
  }

  /**
   * Get all grades with their assigned subjects
   */
  async findAllGradesWithSubjects() {
    const grades = await prisma.grade.findMany({
      orderBy: {
        sequence: "asc",
      },
      include: {
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
                departmentId: true,
                department: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            subject: {
              name: "asc",
            },
          },
        },
      },
    });

    return grades;
  }

  /**
   * Check if subject is already assigned to grade
   */
  async isSubjectAssignedToGrade(
    gradeId: string,
    subjectId: string
  ): Promise<boolean> {
    const existing = await prisma.gradeSubject.findUnique({
      where: {
        gradeId_subjectId: {
          gradeId,
          subjectId,
        },
      },
    });
    return existing !== null;
  }

  /**
   * Assign a subject to a grade
   */
  async assignSubjectToGrade(data: {
    gradeId: string;
    subjectId: string;
    isCore: boolean;
  }) {
    return prisma.gradeSubject.create({
      data: {
        grade: { connect: { id: data.gradeId } },
        subject: { connect: { id: data.subjectId } },
        isCore: data.isCore,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            departmentId: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        grade: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    });
  }

  /**
   * Bulk assign subjects to a grade
   * Replaces all existing assignments
   */
  async bulkAssignSubjectsToGrade(
    gradeId: string,
    subjects: Array<{ subjectId: string; isCore: boolean }>
  ) {
    return prisma.$transaction(async (tx) => {
      // Delete existing assignments
      await tx.gradeSubject.deleteMany({
        where: { gradeId },
      });

      // Create new assignments
      if (subjects.length > 0) {
        await tx.gradeSubject.createMany({
          data: subjects.map((s) => ({
            gradeId,
            subjectId: s.subjectId,
            isCore: s.isCore,
          })),
        });
      }

      // Return updated grade with subjects
      return tx.grade.findUnique({
        where: { id: gradeId },
        include: {
          subjects: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  departmentId: true,
                  department: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              subject: {
                name: "asc",
              },
            },
          },
        },
      });
    });
  }

  /**
   * Update isCore flag for a grade-subject assignment
   */
  async updateSubjectCoreStatus(
    gradeId: string,
    subjectId: string,
    isCore: boolean
  ) {
    return prisma.gradeSubject.update({
      where: {
        gradeId_subjectId: {
          gradeId,
          subjectId,
        },
      },
      data: {
        isCore,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        grade: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    });
  }

  /**
   * Remove a subject from a grade
   */
  async removeSubjectFromGrade(gradeId: string, subjectId: string) {
    return prisma.gradeSubject.delete({
      where: {
        gradeId_subjectId: {
          gradeId,
          subjectId,
        },
      },
    });
  }

  /**
   * Get all available subjects (for assignment dropdown)
   */
  async findAllSubjects() {
    return prisma.subject.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  /**
   * Get all grades (for grade selection)
   */
  async findAllGrades() {
    return prisma.grade.findMany({
      orderBy: {
        sequence: "asc",
      },
      select: {
        id: true,
        name: true,
        level: true,
        sequence: true,
      },
    });
  }

  // ==================== CLASS SUBJECT METHODS ====================

  /**
   * Get all subjects assigned to a class/stream
   */
  async findSubjectsByClass(classId: string) {
    return prisma.classSubject.findMany({
      where: { classId },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            departmentId: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            grade: {
              select: {
                id: true,
                name: true,
                level: true,
              },
            },
          },
        },
      },
      orderBy: {
        subject: {
          name: "asc",
        },
      },
    });
  }

  /**
   * Bulk assign subjects to a class/stream
   * Replaces all existing assignments
   */
  async bulkAssignSubjectsToClass(
    classId: string,
    subjects: Array<{ subjectId: string; isCore: boolean; periodsPerWeek?: number }>
  ) {
    return prisma.$transaction(async (tx) => {
      // Delete existing assignments
      await tx.classSubject.deleteMany({
        where: { classId },
      });

      // Create new assignments
      if (subjects.length > 0) {
        await tx.classSubject.createMany({
          data: subjects.map((s) => ({
            classId,
            subjectId: s.subjectId,
            isCore: s.isCore,
            periodsPerWeek: s.periodsPerWeek ?? 5, // Default to 5 periods per week if not specified
          })),
        });
      }

      // Return updated class with subjects
      return tx.class.findUnique({
        where: { id: classId },
        include: {
          grade: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
          classSubjects: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  departmentId: true,
                  department: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              subject: {
                name: "asc",
              },
            },
          },
        },
      });
    });
  }

  /**
   * Check if class exists
   */
  async findClassById(classId: string) {
    return prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        status: true,
        gradeId: true,
        grade: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    });
  }
}

// Singleton instance
export const curriculumManagementRepository =
  new CurriculumManagementRepository();
