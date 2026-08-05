import { Role } from "@/types/prisma-enums";

/**
 * Role-based routing configuration
 * Maps user roles to their default dashboard routes
 * NOTE: HOD removed - HOD is a position, not a role
 * HOD dashboard access requires position-based check via Department.hodTeacherId
 */
export const ROLE_ROUTES: Record<Role, string> = {
  ADMIN: "/admin",
  HEAD_TEACHER: "/admin",
  DEPUTY_HEAD: "/deputy-head",
  CLERK: "/admin",
  TEACHER: "/teacher",
};

/**
 * Get the default route for a given role
 */
export function getRoleRoute(role: Role): string {
  return ROLE_ROUTES[role] || "/admin";
}

/**
 * Check if a user role has access to a given route prefix
 * NOTE: /hod routes require position-based check, not included here
 */
export function canAccessRoute(role: Role, routePrefix: string): boolean {
  const adminRoles: Role[] = ["ADMIN", "HEAD_TEACHER", "CLERK"];

  if (routePrefix.startsWith("/admin")) {
    return adminRoles.includes(role);
  }

  if (routePrefix.startsWith("/deputy-head")) {
    return role === "DEPUTY_HEAD" || role === "HEAD_TEACHER" || role === "ADMIN";
  }

  if (routePrefix.startsWith("/teacher")) {
    return role === "TEACHER" || role === "DEPUTY_HEAD" || role === "HEAD_TEACHER" || role === "ADMIN";
  }

  // /hod routes: allow TEACHER role — actual HOD position check is done
  // by the individual pages/APIs via Department.hodTeacherId
  if (routePrefix.startsWith("/hod")) {
    return role === "TEACHER" || role === "DEPUTY_HEAD" || role === "HEAD_TEACHER" || role === "ADMIN";
  }

  return false;
}

/**
 * Roles that have access to admin routes
 */
export const ADMIN_ROLES: Role[] = ["ADMIN", "HEAD_TEACHER", "CLERK"];

/**
 * Check if a role is an admin role
 */
export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}
