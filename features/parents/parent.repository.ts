import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { Guardian, ParentStatus,  } from "@/types/prisma-enums";

export class ParentRepository {
  /**
   * Create a new guardian
   */
  async create(data: Prisma.GuardianCreateInput): Promise<Guardian> {
    return await prisma.guardian.create({
      data,
    });
  }

  /**
   * Find guardian by ID
   */
  async findById(id: string): Promise<Guardian | null> {
    return await prisma.guardian.findUnique({
      where: { id },
    });
  }

  /**
   * Find guardian by ID with relations (students)
   */
  async findByIdWithRelations(id: string) {
    return await prisma.guardian.findUnique({
      where: { id },
      include: {
        studentGuardians: {
          include: {
            student: true,
          },
        },
      },
    });
  }

  /**
   * Find guardian by phone number
   */
  async findByPhone(phone: string): Promise<Guardian | null> {
    return await prisma.guardian.findFirst({
      where: { phone },
    });
  }

  /**
   * Find guardian by email
   */
  async findByEmail(email: string): Promise<Guardian | null> {
    return await prisma.guardian.findFirst({
      where: { email },
    });
  }

  /**
   * Find guardians by status
   */
  async findByStatus(status: ParentStatus): Promise<Guardian[]> {
    return await prisma.guardian.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
    });
  }


  /**
   * Search guardians by name or phone
   */
  async search(query: string): Promise<Guardian[]> {
    return await prisma.guardian.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /**
   * Get all guardians with pagination
   */
  async findAll(
    skip: number = 0,
    take: number = 10,
    where?: Prisma.GuardianWhereInput
  ): Promise<{ data: any[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.guardian.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              studentGuardians: true,
            },
          },
        },
      }),
      prisma.guardian.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Update guardian
   */
  async update(
    id: string,
    data: Prisma.GuardianUpdateInput
  ): Promise<Guardian> {
    return await prisma.guardian.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete guardian
   */
  async delete(id: string): Promise<Guardian> {
    return await prisma.guardian.delete({
      where: { id },
    });
  }

  /**
   * Get count of students for a guardian
   */
  async getStudentCount(guardianId: string): Promise<number> {
    return await prisma.studentGuardian.count({
      where: { guardianId },
    });
  }

  /**
   * Get guardian's students
   */
  async getStudents(guardianId: string) {
    return await prisma.studentGuardian.findMany({
      where: { guardianId },
      include: {
        student: true,
      },
    });
  }

  /**
   * Find an existing student-guardian link
   */
  async findStudentGuardianLink(studentId: string, guardianId: string) {
    return prisma.studentGuardian.findFirst({
      where: { studentId, guardianId },
    });
  }

  /**
   * Link a student to a guardian. If marked primary, atomically clears the
   * primary flag from the student's other guardians first (single transaction
   * so a mid-way failure can't leave two guardians both marked primary).
   */
  async linkStudent(
    studentId: string,
    guardianId: string,
    relationship: Prisma.StudentGuardianCreateInput["relationship"],
    isPrimary: boolean
  ) {
    return prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.studentGuardian.updateMany({
          where: { studentId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.studentGuardian.create({
        data: {
          student: { connect: { id: studentId } },
          guardian: { connect: { id: guardianId } },
          relationship,
          isPrimary,
        },
        include: {
          student: {
            select: { firstName: true, middleName: true, lastName: true, studentNumber: true },
          },
          guardian: { select: { firstName: true, lastName: true, phone: true } },
        },
      });
    });
  }

  /**
   * Remove a student-guardian link by its own ID
   */
  async unlinkStudent(linkId: string): Promise<void> {
    await prisma.studentGuardian.delete({ where: { id: linkId } });
  }
}

export const parentRepository = new ParentRepository();
