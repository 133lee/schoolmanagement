import { Prisma } from "@prisma/client";
import { Subject } from "@/types/prisma-enums";
import prisma from "@/lib/db/prisma";

/**
 * Subject Repository - Data Access Layer
 *
 * Handles all database operations for subjects.
 * This is a thin abstraction over Prisma with no business logic.
 */

export class SubjectRepository {
  /**
   * Create a new subject
   */
  async create(data: Prisma.SubjectCreateInput): Promise<Subject> {
    return await prisma.subject.create({
      data,
    });
  }

  /**
   * Find all subjects
   */
  async findAll(): Promise<Subject[]> {
    return await prisma.subject.findMany({
      orderBy: { name: "asc" },
    });
  }

  /**
   * Find subject by ID
   */
  async findById(id: string): Promise<Subject | null> {
    return await prisma.subject.findUnique({
      where: { id },
    });
  }

  /**
   * Find subject by ID with relations (department, grades, teachers)
   */
  async findByIdWithRelations(id: string) {
    return await prisma.subject.findUnique({
      where: { id },
      include: {
        department: true,
        gradeSubjects: {
          include: {
            grade: true,
          },
          orderBy: {
            grade: {
              sequence: "asc",
            },
          },
        },
        teacherSubjects: {
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
          orderBy: {
            teacher: {
              lastName: "asc",
            },
          },
        },
      },
    });
  }

  /**
   * Find subject by code (case-insensitive)
   */
  async findByCode(code: string): Promise<Subject | null> {
    return await prisma.subject.findFirst({
      where: {
        code: {
          equals: code,
          mode: "insensitive",
        },
      },
    });
  }

  /**
   * Find subject by name (case-insensitive)
   */
  async findByName(name: string): Promise<Subject | null> {
    return await prisma.subject.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });
  }

  /**
   * Find subjects by department
   */
  async findByDepartment(departmentId: string): Promise<Subject[]> {
    return await prisma.subject.findMany({
      where: { departmentId },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Find many subjects with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SubjectWhereInput;
    orderBy?: Prisma.SubjectOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return await prisma.subject.findMany({
      skip,
      take,
      where,
      orderBy: orderBy || { name: "asc" },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        teacherSubjects: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            teacher: {
              lastName: "asc",
            },
          },
        },
      },
    });
  }

  /**
   * Count subjects with optional filters
   */
  async count(where?: Prisma.SubjectWhereInput): Promise<number> {
    return await prisma.subject.count({ where });
  }

  /**
   * Update a subject
   */
  async update(id: string, data: Prisma.SubjectUpdateInput): Promise<Subject> {
    return await prisma.subject.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a subject (hard delete)
   */
  async delete(id: string): Promise<Subject> {
    return await prisma.subject.delete({
      where: { id },
    });
  }

  /**
   * Check if subject exists by code
   */
  async existsByCode(code: string): Promise<boolean> {
    const count = await prisma.subject.count({
      where: {
        code: {
          equals: code,
          mode: "insensitive",
        },
      },
    });
    return count > 0;
  }

  /**
   * Check if subject exists by name
   */
  async existsByName(name: string): Promise<boolean> {
    const count = await prisma.subject.count({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });
    return count > 0;
  }

  /**
   * Get teacher count for a subject
   */
  async getTeacherCount(subjectId: string): Promise<number> {
    return await prisma.teacherSubject.count({
      where: { subjectId },
    });
  }

  /**
   * Get grade count for a subject
   */
  async getGradeCount(subjectId: string): Promise<number> {
    return await prisma.gradeSubject.count({
      where: { subjectId },
    });
  }

  /**
   * Assign subject to a grade
   */
  async assignToGrade(
    subjectId: string,
    gradeId: string,
    isCore: boolean = true
  ) {
    return await prisma.gradeSubject.create({
      data: {
        subjectId,
        gradeId,
        isCore,
      },
    });
  }

  /**
   * Remove subject from a grade
   */
  async removeFromGrade(subjectId: string, gradeId: string) {
    return await prisma.gradeSubject.deleteMany({
      where: {
        subjectId,
        gradeId,
      },
    });
  }

  /**
   * Find a subject with just the relation counts needed for the
   * "is this subject actively used?" pre-delete/edit check.
   */
  async findByIdWithUsageRelations(id: string) {
    return prisma.subject.findUnique({
      where: { id },
      include: {
        teacherSubjects: { select: { id: true } },
        subjectTeacherAssignments: { select: { id: true } },
        assessments: { select: { id: true } },
        reportCardSubjects: { select: { id: true } },
        classTimetables: { select: { id: true } },
        secondaryTimetables: { select: { id: true } },
      },
    });
  }
}

export const subjectRepository = new SubjectRepository();
