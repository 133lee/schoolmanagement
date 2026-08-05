import prisma from "@/lib/db/prisma";
import { User, Role } from "@/types/prisma-enums";

export interface UserWithProfile extends User {
  profile?: {
    id: string;
    staffNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    phone: string;
    status: string;
  } | null;
}

export class AuthRepository {
  /**
   * Find user by email with profile data
   * Note: Email is converted to lowercase for case-insensitive matching
   */
  async findUserByEmail(email: string): Promise<UserWithProfile | null> {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        profile: {
          select: {
            id: true,
            staffNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            phone: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Find user by ID with profile data
   */
  async findUserById(id: string): Promise<UserWithProfile | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          select: {
            id: true,
            staffNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            phone: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  /**
   * Update a user's password hash and clear the default-password flag
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, hasDefaultPassword: false },
    });
  }

  /**
   * Check if user is active
   */
  async isUserActive(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });
    return user?.isActive ?? false;
  }

  /**
   * Get user permissions (role-based + user-specific overrides)
   */
  async getUserPermissions(userId: string, role: Role): Promise<string[]> {
    // Get role-based permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role },
      select: { permission: true },
    });

    // Get user-specific permissions (non-expired)
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ],
      },
      select: { permission: true },
    });

    // Combine and deduplicate
    const allPermissions = [
      ...rolePermissions.map(p => p.permission),
      ...userPermissions.map(p => p.permission),
    ];

    return Array.from(new Set(allPermissions));
  }
}

export const authRepository = new AuthRepository();
