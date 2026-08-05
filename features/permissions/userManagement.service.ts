import { userRepository } from "./user.repository";
import { userPermissionRepository } from "./userPermission.repository";
import { Role, Permission } from "@/types/prisma-enums";
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/http/errors";
import { AuthContext } from "@/lib/auth/authorization";

export interface UserFilters {
  search?: string;
  role?: Role;
  status?: "active" | "inactive";
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface AddOverrideInput {
  permission: Permission;
  expiresAt?: string | null;
  reason: string;
}

/**
 * User & Permission Management Service - Business Logic Layer
 *
 * Backs the admin "Permissions" screen: listing users with their permission
 * overrides, changing roles, and granting/revoking time-boxed overrides.
 * Distinct from features/auth (login) and features/teachers (staff CRUD).
 */
export class UserManagementService {
  private requireManagePermissions(context: AuthContext) {
    if (!["ADMIN", "HEAD_TEACHER"].includes(context.role)) {
      throw new ForbiddenError("Insufficient permissions to manage user permissions");
    }
  }

  private requireAdmin(context: AuthContext) {
    if (context.role !== "ADMIN") {
      throw new ForbiddenError("Only administrators can perform this action");
    }
  }

  async listUsers(filters: UserFilters, pagination: PaginationParams, context: AuthContext) {
    this.requireManagePermissions(context);

    const where: Parameters<typeof userRepository.findManyWithPermissions>[0] = {};

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        {
          profile: {
            OR: [
              { firstName: { contains: filters.search, mode: "insensitive" } },
              { lastName: { contains: filters.search, mode: "insensitive" } },
              { staffNumber: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.status === "active") {
      where.isActive = true;
    } else if (filters.status === "inactive") {
      where.isActive = false;
    }

    const skip = (pagination.page - 1) * pagination.pageSize;
    const [users, total] = await Promise.all([
      userRepository.findManyWithPermissions(where, { skip, take: pagination.pageSize }),
      userRepository.count(where),
    ]);

    return {
      data: users,
      meta: {
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    };
  }

  /**
   * Flat list of active users (optionally filtered by role) with display
   * name — used by admin-only user pickers, distinct from the paginated
   * permissions-management listUsers() view.
   */
  async getActiveUsersList(roleFilter: string | null, context: AuthContext) {
    this.requireAdmin(context);

    if (roleFilter && !Object.values(Role).includes(roleFilter as Role)) {
      throw new ValidationError(
        `Invalid role: ${roleFilter}. Valid roles are: ${Object.values(Role).join(", ")}`
      );
    }

    const users = await userRepository.findActiveWithProfileNames(roleFilter as Role | undefined);

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      profile: u.profile ? { firstName: u.profile.firstName, lastName: u.profile.lastName } : null,
    }));
  }

  async updateUserRole(userId: string, role: Role, context: AuthContext) {
    this.requireAdmin(context);

    if (!Object.values(Role).includes(role)) {
      throw new ValidationError("Invalid role provided");
    }

    const existingUser = await userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError("User not found");
    }

    if (existingUser.id === context.userId) {
      throw new ValidationError("Cannot change your own role");
    }

    if (existingUser.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await userRepository.countActiveAdmins();
      if (adminCount <= 1) {
        throw new ValidationError("Cannot change the role of the last active administrator");
      }
    }

    return userRepository.updateRole(userId, role);
  }

  async addPermissionOverride(userId: string, input: AddOverrideInput, context: AuthContext) {
    this.requireAdmin(context);

    if (!input.permission || !Object.values(Permission).includes(input.permission)) {
      throw new ValidationError("Invalid permission provided");
    }

    if (!input.reason || input.reason.trim().length === 0) {
      throw new ValidationError("Reason is required for audit purposes");
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const existing = await userPermissionRepository.findByUserAndPermission(
      userId,
      input.permission
    );
    if (existing) {
      throw new ConflictError("This permission override already exists for this user");
    }

    const grantedById = await userRepository.findTeacherProfileId(context.userId);

    return userPermissionRepository.create({
      user: { connect: { id: userId } },
      permission: input.permission,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      reason: input.reason.trim(),
      ...(grantedById && { grantedBy: { connect: { id: grantedById } } }),
    });
  }

  async removePermissionOverride(userId: string, permission: Permission, context: AuthContext) {
    this.requireAdmin(context);

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const existing = await userPermissionRepository.findByUserAndPermission(userId, permission);
    if (!existing) {
      throw new NotFoundError("Permission override not found");
    }

    await userPermissionRepository.deleteByUserAndPermission(userId, permission);
  }
}

export const userManagementService = new UserManagementService();
