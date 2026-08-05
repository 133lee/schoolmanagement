/**
 * Position-Based Authorization Helpers
 *
 * HOD (Head of Department) is a POSITION, not a role.
 * A user's HOD status is determined exclusively by Department.hodTeacherId assignment.
 *
 * This module provides the single source of truth for HOD position checks.
 */

import prisma from "@/lib/db/prisma";

/**
 * Get the department where the user is assigned as HOD
 *
 * Returns the department if user is HOD, null otherwise
 * This is the SINGLE SOURCE OF TRUTH for HOD status
 *
 * @param userId - The user ID to check
 * @returns The department object if user is HOD, null otherwise
 *
 * @example
 * const dept = await getHODDepartment(userId);
 * if (dept) {
 *   console.log(`User is HOD of ${dept.name}`);
 * }
 */
export async function getHODDepartment(userId: string) {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: {
      departmentAsHOD: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },
    },
  });

  return teacher?.departmentAsHOD ?? null;
}

/**
 * Check if user is HOD of a specific department
 *
 * @param userId - The user ID to check
 * @param departmentId - The department ID to check against
 * @returns true if user is HOD of the specified department
 *
 * @example
 * if (await isHODOfDepartment(userId, departmentId)) {
 *   // User has HOD authority for this department
 * }
 */
export async function isHODOfDepartment(
  userId: string,
  departmentId: string
): Promise<boolean> {
  const dept = await getHODDepartment(userId);
  return dept?.id === departmentId;
}

/**
 * Check if user is HOD of any department
 *
 * @param userId - The user ID to check
 * @returns true if user is HOD of any department
 *
 * @example
 * if (await isHOD(userId)) {
 *   // User has HOD position somewhere
 * }
 */
export async function isHOD(userId: string): Promise<boolean> {
  const dept = await getHODDepartment(userId);
  return dept !== null;
}

/**
 * Require that user is HOD of a specific department
 * Throws error if not
 *
 * @param userId - The user ID to check
 * @param departmentId - The department ID to check against
 * @param errorMessage - Optional custom error message
 * @throws Error if user is not HOD of the specified department
 *
 * @example
 * await requireHODOfDepartment(userId, departmentId, "Only HOD can manage this");
 */
export async function requireHODOfDepartment(
  userId: string,
  departmentId: string,
  errorMessage?: string
): Promise<void> {
  const isAuthorized = await isHODOfDepartment(userId, departmentId);

  if (!isAuthorized) {
    throw new Error(
      errorMessage ||
        "Unauthorized: Only the Head of Department can perform this action"
    );
  }
}

/**
 * Get HOD department info with additional details
 * Useful for dashboard and UI contexts
 *
 * @param userId - The user ID to check
 * @returns Extended department info or null
 *
 * @example
 * const hodInfo = await getHODDepartmentWithDetails(userId);
 * if (hodInfo) {
 *   console.log(`HOD of ${hodInfo.name} with ${hodInfo.teacherCount} teachers`);
 * }
 */
export async function getHODDepartmentWithDetails(userId: string) {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: {
      departmentAsHOD: {
        include: {
          _count: {
            select: {
              subjects: true,
              teachers: true,
            },
          },
        },
      },
    },
  });

  if (!teacher?.departmentAsHOD) return null;

  const dept = teacher.departmentAsHOD;
  return {
    id: dept.id,
    name: dept.name,
    code: dept.code,
    status: dept.status,
    description: dept.description,
    subjectCount: dept._count?.subjects ?? 0,
    teacherCount: dept._count?.teachers ?? 0,
  };
}
