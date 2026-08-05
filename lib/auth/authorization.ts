/**
 * Authorization Helpers
 *
 * Provides simple functions to check permissions in service layers
 */

import { Role } from '@/types/prisma-enums';
import { hasRoleAuthority, roleHasPermission } from './role-hierarchy';
import { UnauthorizedError } from '@/lib/errors';

export interface AuthContext {
  userId: string;
  role: Role;
}

/**
 * Require that user has at least the specified role level
 * Throws UnauthorizedError if check fails
 *
 * @example
 * // Only DEPUTY_HEAD and above can access this
 * requireMinimumRole(context, Role.DEPUTY_HEAD, "Only Deputy Heads can manage this");
 */
export function requireMinimumRole(
  context: AuthContext,
  minimumRole: Role,
  errorMessage?: string
): void {
  if (!hasRoleAuthority(context.role, minimumRole)) {
    throw new UnauthorizedError(
      errorMessage || `This action requires ${minimumRole} role or higher`
    );
  }
}

/**
 * Require one of several possible roles
 * Throws UnauthorizedError if user doesn't have any of the specified roles
 *
 * @example
 * // Either CLERK or DEPUTY_HEAD+ can manage students
 * requireAnyRole(context, [Role.CLERK, Role.DEPUTY_HEAD], "Insufficient permissions");
 */
export function requireAnyRole(
  context: AuthContext,
  allowedRoles: Role[],
  errorMessage?: string
): void {
  const hasAccess = allowedRoles.some(role =>
    hasRoleAuthority(context.role, role)
  );

  if (!hasAccess) {
    throw new UnauthorizedError(
      errorMessage || `This action requires one of: ${allowedRoles.join(', ')}`
    );
  }
}

/**
 * Require specific permission
 * Throws UnauthorizedError if user doesn't have the permission
 *
 * @example
 * requirePermission(context, 'manage_department', "Cannot manage departments");
 */
export function requirePermission(
  context: AuthContext,
  permission: string,
  errorMessage?: string
): void {
  if (!roleHasPermission(context.role, permission)) {
    throw new UnauthorizedError(
      errorMessage || `This action requires '${permission}' permission`
    );
  }
}

/**
 * Check if user is admin
 */
export function isAdmin(context: AuthContext): boolean {
  return context.role === Role.ADMIN;
}

/**
 * Check if user is teacher or higher in hierarchy
 */
export function isTeacher(context: AuthContext): boolean {
  return hasRoleAuthority(context.role, Role.TEACHER);
}

/**
 * Check if user is school leadership (Deputy Head or higher)
 */
export function isLeadership(context: AuthContext): boolean {
  return hasRoleAuthority(context.role, Role.DEPUTY_HEAD);
}

/**
 * DEPRECATED: isHOD removed - HOD is a position, not a role
 *
 * HOD status is determined by Department.hodTeacherId assignment
 * Use position helpers from lib/auth/position-helpers.ts instead:
 *
 * @example
 * import { getHODDepartment } from '@/lib/auth/position-helpers';
 * const dept = await getHODDepartment(userId);
 * if (dept) { // User is HOD of a department }
 */

/**
 * Require that user can only access their own resource or is admin
 *
 * @example
 * // Teachers can only view their own data, admins can view anyone's
 * requireOwnerOrAdmin(context, userId, "Cannot access other user's data");
 */
export function requireOwnerOrAdmin(
  context: AuthContext,
  resourceOwnerId: string,
  errorMessage?: string
): void {
  if (context.userId !== resourceOwnerId && !isAdmin(context)) {
    throw new UnauthorizedError(
      errorMessage || 'You can only access your own resources'
    );
  }
}

/**
 * Require that user can only access their own resource or has minimum role
 *
 * @example
 * // Teachers can view their own assessments, Deputy Heads can view all
 * requireOwnerOrMinimumRole(
 *   context,
 *   assessment.createdBy,
 *   Role.DEPUTY_HEAD,
 *   "Cannot access this assessment"
 * );
 */
export function requireOwnerOrMinimumRole(
  context: AuthContext,
  resourceOwnerId: string,
  minimumRole: Role,
  errorMessage?: string
): void {
  const isOwner = context.userId === resourceOwnerId;
  const hasRole = hasRoleAuthority(context.role, minimumRole);

  if (!isOwner && !hasRole) {
    throw new UnauthorizedError(
      errorMessage || `You must own this resource or have ${minimumRole} role`
    );
  }
}
