import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { Class, ClassStatus } from "@/types/prisma-enums";

/**
 * Class Repository
 *
 * Handles all database operations for the Class entity.
 * This layer is a thin abstraction over Prisma with NO business logic.
 */
export class ClassRepository {
  /**
   * Create a new class
   */
  async create(data: Prisma.ClassCreateInput): Promise<Class> {
    return await prisma.class.create({
      data,
    });
  }

  /**
   * Find all classes
   */
  async findAll(): Promise<Class[]> {
    return await prisma.class.findMany({
      orderBy: [
        { grade: { sequence: "asc" } },
        { name: "asc" },
      ],
      include: {
        grade: true,
      },
    });
  }

  /**
   * Find a class by ID
   */
  async findById(id: string): Promise<Class | null> {
    return await prisma.class.findUnique({
      where: { id },
      include: {
        grade: true,
      },
    });
  }

  /**
   * Find a class by ID with all relations
   * Returns classSubjects (curriculum) with teacher assignments for the class sheet
   */
  async findByIdWithRelations(id: string) {
    // Get active academic year to filter assignments
    const activeYear = await this.getActiveAcademicYear();

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        grade: true,
        enrollments: {
          include: {
            student: true,
          },
          where: {
            status: "ACTIVE",
            ...(activeYear && { academicYearId: activeYear.id }),
          },
        },
        classTeacherAssignments: {
          where: activeYear ? {
            academicYearId: activeYear.id,
          } : undefined,
          include: {
            teacher: true,
          },
        },
        // Include ClassSubjects (curriculum) with their teacher assignments
        classSubjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            // Include teacher assignments for this classSubject
            subjectTeacherAssignments: {
              where: activeYear ? {
                academicYearId: activeYear.id,
              } : undefined,
              include: {
                teacher: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    staffNumber: true,
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

    if (!classData) return null;

    // Transform enrollments to students array for easier consumption
    const { enrollments, ...rest } = classData;
    return {
      ...rest,
      students: enrollments.map((enrollment) => enrollment.student),
      currentEnrolled: enrollments.length, // Calculate current enrollment count
    };
  }

  /**
   * Find class by grade and name
   */
  async findByGradeAndName(
    gradeId: string,
    name: string
  ): Promise<Class | null> {
    return await prisma.class.findUnique({
      where: {
        gradeId_name: {
          gradeId,
          name,
        },
      },
      include: {
        grade: true,
      },
    });
  }

  /**
   * Find all classes for a specific grade
   */
  async findByGradeId(gradeId: string): Promise<Class[]> {
    return await prisma.class.findMany({
      where: { gradeId },
      orderBy: { name: "asc" },
      include: {
        grade: true,
      },
    });
  }

  /**
   * Find classes by status
   */
  async findByStatus(status: ClassStatus): Promise<Class[]> {
    return await prisma.class.findMany({
      where: { status },
      orderBy: [
        { grade: { sequence: "asc" } },
        { name: "asc" },
      ],
      include: {
        grade: true,
      },
    });
  }

  /**
   * Find many classes with flexible filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ClassWhereInput;
    orderBy?: Prisma.ClassOrderByWithRelationInput | Prisma.ClassOrderByWithRelationInput[];
  }): Promise<Class[]> {
    const { skip, take, where, orderBy } = params;

    // Get active academic year to filter assignments
    const activeYear = await this.getActiveAcademicYear();

    return await prisma.class.findMany({
      skip,
      take,
      where,
      orderBy: orderBy || [
        { grade: { sequence: "asc" } },
        { name: "asc" },
      ],
      include: {
        grade: true,
        classTeacherAssignments: {
          where: activeYear ? {
            academicYearId: activeYear.id,
          } : undefined,
          include: {
            teacher: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        subjectTeacherAssignments: {
          where: activeYear ? {
            academicYearId: activeYear.id,
          } : undefined,
          include: {
            subject: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: {
              where: {
                status: "ACTIVE",
              },
            },
          },
        },
      },
    });
  }

  /**
   * Count classes matching criteria
   */
  async count(where?: Prisma.ClassWhereInput): Promise<number> {
    return await prisma.class.count({ where });
  }

  /**
   * Update a class
   */
  async update(
    id: string,
    data: Prisma.ClassUpdateInput
  ): Promise<Class> {
    return await prisma.class.update({
      where: { id },
      data,
      include: {
        grade: true,
      },
    });
  }

  /**
   * Delete a class
   */
  async delete(id: string): Promise<Class> {
    return await prisma.class.delete({
      where: { id },
      include: {
        grade: true,
      },
    });
  }

  /**
   * Check if a class exists with the given grade and name
   */
  async existsByGradeAndName(gradeId: string, name: string): Promise<boolean> {
    const count = await prisma.class.count({
      where: {
        gradeId,
        name,
      },
    });
    return count > 0;
  }

  /**
   * Get current enrollment count for a class
   * (Computed dynamically - no longer stored in Class model)
   */
  async getCurrentEnrollmentCount(classId: string): Promise<number> {
    return await prisma.studentClassEnrollment.count({
      where: {
        classId,
        status: "ACTIVE",
      },
    });
  }

  /**
   * Get total enrollment count for a class (all statuses)
   * Used for deletion validation to prevent deleting classes with any enrollments
   */
  async getEnrollmentCount(classId: string): Promise<number> {
    return await prisma.studentClassEnrollment.count({
      where: {
        classId,
      },
    });
  }

  // ==================== CLASS TEACHER MANAGEMENT ====================

  /**
   * Get the currently active academic year
   */
  async getActiveAcademicYear() {
    return await prisma.academicYear.findFirst({
      where: {
        isActive: true,
      },
    });
  }

  /**
   * Find class teacher assignment for a teacher in a specific academic year
   */
  async findClassTeacherAssignment(teacherId: string, academicYearId: string) {
    return await prisma.classTeacherAssignment.findFirst({
      where: {
        teacherId,
        academicYearId,
      },
      include: {
        class: {
          include: {
            grade: true,
          },
        },
      },
    });
  }

  /**
   * Remove class teacher assignment for a class in a specific academic year
   */
  async removeClassTeacher(classId: string, academicYearId: string) {
    const existing = await prisma.classTeacherAssignment.findUnique({
      where: {
        classId_academicYearId: {
          classId,
          academicYearId,
        },
      },
    });

    if (existing) {
      await prisma.classTeacherAssignment.delete({
        where: {
          classId_academicYearId: {
            classId,
            academicYearId,
          },
        },
      });
    }
  }

  /**
   * Assign a teacher as class teacher for a specific academic year
   */
  async assignClassTeacher(
    classId: string,
    teacherId: string,
    academicYearId: string
  ) {
    return await prisma.classTeacherAssignment.create({
      data: {
        classId,
        teacherId,
        academicYearId,
      },
      include: {
        teacher: true,
        class: {
          include: {
            grade: true,
          },
        },
      },
    });
  }

  /**
   * Assign a teacher to all subjects for a class (PRIMARY grades)
   * This is used when assigning a class teacher to a primary grade class
   */
  async assignTeacherToAllSubjects(
    classId: string,
    teacherId: string,
    academicYearId: string
  ) {
    // First, get all subjects for the class's grade
    const classWithGrade = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        grade: {
          include: {
            subjects: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
    });

    if (!classWithGrade || !classWithGrade.grade) {
      throw new Error("Class or grade not found");
    }

    // Create subject teacher assignments for all subjects in the grade
    const assignments = classWithGrade.grade.subjects.map((gs) => ({
      classId,
      subjectId: gs.subjectId,
      teacherId,
      academicYearId,
    }));

    // Delete any existing assignments for this class and academic year first
    await prisma.subjectTeacherAssignment.deleteMany({
      where: {
        classId,
        academicYearId,
      },
    });

    // Create new assignments
    if (assignments.length > 0) {
      await prisma.subjectTeacherAssignment.createMany({
        data: assignments,
        skipDuplicates: true,
      });
    }

    return assignments.length;
  }

  /**
   * Remove all subject teacher assignments for a class (PRIMARY grades)
   * This is used when removing a class teacher from a primary grade class
   */
  async removeAllSubjectAssignments(classId: string, academicYearId: string) {
    return await prisma.subjectTeacherAssignment.deleteMany({
      where: {
        classId,
        academicYearId,
      },
    });
  }
}

export const classRepository = new ClassRepository();
