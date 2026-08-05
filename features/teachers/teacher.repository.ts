import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { TeacherProfile } from "@/types/prisma-enums";

/**
 * Teacher Repository - Data Access Layer
 *
 * Thin abstraction over Prisma for TeacherProfile entity.
 * No business logic. No validation. Just database operations.
 */
export class TeacherRepository {
  /**
   * Create a new teacher profile record
   */
  create(data: Prisma.TeacherProfileCreateInput): Promise<TeacherProfile> {
    return prisma.teacherProfile.create({ data });
  }

  /**
   * Find all teachers
   */
  findAll(): Promise<TeacherProfile[]> {
    return prisma.teacherProfile.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find teacher by ID
   */
  findById(id: string): Promise<TeacherProfile | null> {
    return prisma.teacherProfile.findUnique({
      where: { id },
    });
  }

  /**
   * Find teacher by ID with relations
   */
  findByIdWithRelations(id: string) {
    return prisma.teacherProfile.findUnique({
      where: { id },
      include: {
        user: true,
        departments: {
          include: {
            department: true,
          },
        },
        subjects: {
          include: {
            subject: true,
          },
        },
        classTeacherAssignments: {
          include: {
            class: {
              include: {
                grade: true,
              },
            },
            academicYear: true,
          },
        },
        subjectTeacherAssignments: {
          include: {
            subject: true,
            class: {
              include: {
                grade: true,
              },
            },
            academicYear: true,
          },
        },
      },
    });
  }

  /**
   * Find teacher by staff number
   */
  findByStaffNumber(staffNumber: string): Promise<TeacherProfile | null> {
    return prisma.teacherProfile.findUnique({
      where: { staffNumber },
    });
  }

  /**
   * Find teacher by user ID
   */
  findByUserId(userId: string): Promise<TeacherProfile | null> {
    return prisma.teacherProfile.findUnique({
      where: { userId },
    });
  }

  /**
   * Find teachers by status
   */
  findByStatus(status: TeacherProfile["status"]) {
    return prisma.teacherProfile.findMany({
      where: { status },
    });
  }

  /**
   * Find teachers with pagination
   */
  findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.TeacherProfileWhereInput;
    orderBy?: Prisma.TeacherProfileOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return prisma.teacherProfile.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        departments: {
          include: {
            department: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        subjects: {
          include: {
            subject: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  /**
   * Count teachers matching criteria
   */
  count(where?: Prisma.TeacherProfileWhereInput): Promise<number> {
    return prisma.teacherProfile.count({ where });
  }

  /**
   * Update teacher by ID
   */
  update(id: string, data: Prisma.TeacherProfileUpdateInput): Promise<TeacherProfile> {
    return prisma.teacherProfile.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete teacher by ID
   */
  delete(id: string): Promise<TeacherProfile> {
    return prisma.teacherProfile.delete({
      where: { id },
    });
  }

  /**
   * Check if staff number exists
   */
  async existsByStaffNumber(staffNumber: string): Promise<boolean> {
    const count = await prisma.teacherProfile.count({
      where: { staffNumber },
    });
    return count > 0;
  }

  /**
   * Find user by email (for checking if email already exists)
   */
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find a teacher profile with its login account attached (for account
   * management operations like password reset)
   */
  async findByIdWithUser(id: string) {
    return prisma.teacherProfile.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  /**
   * Reset a teacher's login password to a given hash and mark it as a
   * default password requiring change on next login
   */
  async resetPassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, hasDefaultPassword: true },
    });
  }

  /**
   * Assign subjects to a teacher (replaces existing subjects)
   */
  async assignSubjects(teacherId: string, subjectIds: string[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Delete existing subject assignments
      await tx.teacherSubject.deleteMany({
        where: { teacherId },
      });

      // Create new subject assignments
      if (subjectIds.length > 0) {
        await tx.teacherSubject.createMany({
          data: subjectIds.map((subjectId) => ({
            teacherId,
            subjectId,
          })),
        });
      }
    });
  }

  /**
   * Get teacher subjects
   */
  async getTeacherSubjects(teacherId: string) {
    return prisma.teacherSubject.findMany({
      where: { teacherId },
      include: {
        subject: true,
      },
    });
  }
}

export const teacherRepository = new TeacherRepository();
