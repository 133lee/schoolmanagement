import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { UserPermission, Permission } from "@/types/prisma-enums";

/**
 * UserPermission Repository - Data Access Layer
 *
 * Manages user-specific permission overrides.
 * No business logic - pure data access.
 */
export class UserPermissionRepository {
  /**
   * Create a new user permission
   */
  async create(data: Prisma.UserPermissionCreateInput): Promise<UserPermission> {
    try {
      return await prisma.userPermission.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Permission already assigned to this user");
        }
        if (error.code === "P2003") {
          throw new Error("Referenced user or teacher not found");
        }
      }
      throw error;
    }
  }

  /**
   * Create user permission within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.UserPermissionCreateInput
  ): Promise<UserPermission> {
    return tx.userPermission.create({ data });
  }

  /**
   * Find user permission by ID
   */
  async findById(id: string): Promise<UserPermission | null> {
    return prisma.userPermission.findUnique({
      where: { id },
    });
  }

  /**
   * Find user permission by ID with relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.userPermission.findUnique({
      where: { id },
      include: {
        user: true,
        grantedBy: true,
      },
    });
  }

  /**
   * Find all user permissions
   */
  async findAll(): Promise<UserPermission[]> {
    return prisma.userPermission.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        grantedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Find permissions by user
   */
  async findByUser(userId: string): Promise<UserPermission[]> {
    return prisma.userPermission.findMany({
      where: { userId },
      orderBy: { permission: "asc" },
      include: {
        grantedBy: true,
      },
    });
  }

  /**
   * Find active (non-expired) permissions by user
   */
  async findActiveByUser(userId: string): Promise<UserPermission[]> {
    return prisma.userPermission.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { permission: "asc" },
    });
  }

  /**
   * Find expired permissions
   */
  async findExpired(): Promise<UserPermission[]> {
    return prisma.userPermission.findMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find by user and permission (unique)
   */
  async findByUserAndPermission(
    userId: string,
    permission: Permission
  ): Promise<UserPermission | null> {
    return prisma.userPermission.findUnique({
      where: {
        userId_permission: {
          userId,
          permission,
        },
      },
    });
  }

  /**
   * Check if user has active permission
   */
  async hasActivePermission(userId: string, permission: Permission): Promise<boolean> {
    const result = await prisma.userPermission.findFirst({
      where: {
        userId,
        permission,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });
    return result !== null;
  }

  /**
   * Get all active permissions for a user
   */
  async getActivePermissions(userId: string): Promise<Permission[]> {
    const userPermissions = await this.findActiveByUser(userId);
    return userPermissions.map(up => up.permission);
  }

  /**
   * Find many with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserPermissionWhereInput;
    orderBy?: Prisma.UserPermissionOrderByWithRelationInput;
    include?: Prisma.UserPermissionInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;

    return prisma.userPermission.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || { createdAt: "desc" },
      include: include || {
        user: true,
        grantedBy: true,
      },
    });
  }

  /**
   * Count user permissions
   */
  async count(where?: Prisma.UserPermissionWhereInput): Promise<number> {
    return prisma.userPermission.count({ where });
  }

  /**
   * Update user permission
   */
  async update(
    id: string,
    data: Prisma.UserPermissionUpdateInput
  ): Promise<UserPermission> {
    try {
      return await prisma.userPermission.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("User permission not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete user permission
   */
  async delete(id: string): Promise<UserPermission> {
    try {
      return await prisma.userPermission.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("User permission not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete by user and permission
   */
  async deleteByUserAndPermission(
    userId: string,
    permission: Permission
  ): Promise<UserPermission> {
    try {
      return await prisma.userPermission.delete({
        where: {
          userId_permission: {
            userId,
            permission,
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("User permission not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete expired permissions
   */
  async deleteExpired(): Promise<Prisma.BatchPayload> {
    return prisma.userPermission.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });
  }

  /**
   * Bulk create user permissions
   */
  async bulkCreate(
    data: Prisma.UserPermissionCreateManyInput[]
  ): Promise<Prisma.BatchPayload> {
    return prisma.userPermission.createMany({
      data,
      skipDuplicates: true,
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
export const userPermissionRepository = new UserPermissionRepository();
