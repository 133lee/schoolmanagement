import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { User, Role } from "@/types/prisma-enums";

const withProfileAndPermissions = {
  profile: {
    select: { id: true, firstName: true, lastName: true, staffNumber: true },
  },
  userPermissions: {
    include: {
      grantedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.UserInclude;

/**
 * User Repository (permissions-management slice) - Data Access Layer
 *
 * Thin Prisma access for the parts of the User model the permissions
 * management screen needs. Not a general-purpose user repository.
 */
export class UserRepository {
  async findManyWithPermissions(
    where: Prisma.UserWhereInput,
    pagination: { skip: number; take: number }
  ) {
    return prisma.user.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { email: "asc" },
      include: withProfileAndPermissions,
    });
  }

  async count(where: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({ where });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async updateRole(id: string, role: Role) {
    return prisma.user.update({
      where: { id },
      data: { role },
      include: {
        profile: { select: { id: true, firstName: true, lastName: true, staffNumber: true } },
      },
    });
  }

  async countActiveAdmins(): Promise<number> {
    return prisma.user.count({ where: { role: "ADMIN", isActive: true } });
  }

  async findTeacherProfileId(userId: string): Promise<string | null> {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile?.id ?? null;
  }

  /**
   * Flat list of active users with just enough profile info for a
   * name/role picker, optionally filtered by role.
   */
  async findActiveWithProfileNames(role?: Role) {
    return prisma.user.findMany({
      where: { isActive: true, ...(role && { role }) },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        profile: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const userRepository = new UserRepository();
