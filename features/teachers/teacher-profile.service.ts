import prisma from "@/lib/db/prisma";
import { NotFoundError } from "@/lib/http/errors";
import { logger } from "@/lib/logger/logger";
import { TeacherProfileView } from "./teacher-app.types";

/**
 * Teacher Profile Service
 *
 * Business logic for teachers viewing and managing their profile.
 */
export class TeacherProfileService {
  /**
   * Get teacher profile by user ID
   *
   * @param userId - The user ID of the logged-in teacher
   * @returns Complete teacher profile with all relations
   * @throws NotFoundError if teacher profile not found
   * @throws Error if userId is invalid
   */
  async getProfileByUserId(userId: string): Promise<TeacherProfileView> {
    // Input validation
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      logger.error("Invalid userId provided to getProfileByUserId", undefined, { userId });
      throw new Error("Invalid user ID");
    }

    logger.info("Fetching teacher profile", { userId });

    // Fetch teacher profile with related data
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        departments: {
          include: {
            department: {
              select: {
                name: true,
                code: true,
              },
            },
          },
          orderBy: {
            isPrimary: "desc", // Primary department first
          },
          take: 1, // Only get the primary/first department
        },
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        classTeacherAssignments: {
          where: {
            academicYear: {
              isActive: true,
            },
          },
          include: {
            class: {
              include: {
                grade: {
                  select: {
                    name: true,
                    level: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teacherProfile) {
      logger.warn("Teacher profile not found", { userId });
      throw new NotFoundError("Teacher profile not found");
    }

    logger.debug("Teacher profile data retrieved", {
      teacherId: teacherProfile.id,
      staffNumber: teacherProfile.staffNumber,
      hasActiveClassAssignment: teacherProfile.classTeacherAssignments.length > 0,
    });

    // Map to response format
    const profileView = this.mapToProfileView(teacherProfile);

    logger.info("Teacher profile fetched successfully", {
      userId,
      teacherId: teacherProfile.id,
      subjectCount: profileView.subjects.length,
      hasClassTeacherAssignment: !!profileView.classTeacherAssignment,
    });

    return profileView;
  }

  /**
   * Get teacher profile by teacher ID
   *
   * @param teacherId - The teacher profile ID
   * @returns Complete teacher profile with all relations
   * @throws NotFoundError if teacher profile not found
   * @throws Error if teacherId is invalid
   */
  async getProfileByTeacherId(teacherId: string): Promise<TeacherProfileView> {
    // Input validation
    if (!teacherId || typeof teacherId !== "string" || teacherId.trim().length === 0) {
      logger.error("Invalid teacherId provided to getProfileByTeacherId", undefined, { teacherId });
      throw new Error("Invalid teacher ID");
    }

    logger.info("Fetching teacher profile by ID", { teacherId });

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        departments: {
          include: {
            department: {
              select: {
                name: true,
                code: true,
              },
            },
          },
          orderBy: {
            isPrimary: "desc", // Primary department first
          },
          take: 1, // Only get the primary/first department
        },
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        classTeacherAssignments: {
          where: {
            academicYear: {
              isActive: true,
            },
          },
          include: {
            class: {
              include: {
                grade: {
                  select: {
                    name: true,
                    level: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!teacherProfile) {
      logger.warn("Teacher profile not found", { teacherId });
      throw new NotFoundError("Teacher profile not found");
    }

    const profileView = this.mapToProfileView(teacherProfile);

    logger.info("Teacher profile fetched successfully", {
      teacherId,
      subjectCount: profileView.subjects.length,
    });

    return profileView;
  }

  /**
   * Map database teacher profile to TeacherProfileView
   *
   * @param teacherProfile - Raw teacher profile from database
   * @returns Formatted TeacherProfileView
   *
   * SECURITY: Defensive null checks on all nested relations
   */
  private mapToProfileView(teacherProfile: any): TeacherProfileView {
    // Defensive checks for required fields
    if (!teacherProfile.user || !teacherProfile.user.email) {
      logger.error("Teacher profile missing user relation", undefined, {
        teacherId: teacherProfile.id,
      });
      throw new Error("Invalid teacher profile: missing user relation");
    }

    const fullName = `${teacherProfile.firstName} ${teacherProfile.middleName || ""} ${teacherProfile.lastName}`.trim();

    // Get the first (should be only one) active class teacher assignment
    const activeClassAssignment = teacherProfile.classTeacherAssignments?.[0];

    return {
      id: teacherProfile.id,
      staffNumber: teacherProfile.staffNumber,
      firstName: teacherProfile.firstName,
      middleName: teacherProfile.middleName,
      lastName: teacherProfile.lastName,
      fullName,
      gender: teacherProfile.gender,
      dateOfBirth: teacherProfile.dateOfBirth,
      phoneNumber: teacherProfile.phone,
      nrcNumber: null, // Field doesn't exist in schema yet
      email: teacherProfile.user.email,
      dateOfHire: teacherProfile.hireDate,
      status: teacherProfile.status,
      qualification: teacherProfile.qualification,
      specialization: null, // Field doesn't exist in schema yet
      department: teacherProfile.departments?.[0]?.department
        ? {
            name: teacherProfile.departments[0].department.name,
            code: teacherProfile.departments[0].department.code,
          }
        : null,
      subjects: teacherProfile.subjects?.map((ts: any) => ({
        id: ts.subject?.id,
        name: ts.subject?.name,
        code: ts.subject?.code,
      })).filter((s: any) => s.id && s.name && s.code) || [],
      classTeacherAssignment: activeClassAssignment?.class?.grade
        ? {
            className: activeClassAssignment.class.name,
            gradeLevel: activeClassAssignment.class.grade.name,
          }
        : null,
    };
  }

  /**
   * Check if a teacher profile exists for a user
   *
   * @param userId - The user ID
   * @returns True if teacher profile exists
   */
  async profileExists(userId: string): Promise<boolean> {
    logger.debug("Checking if teacher profile exists", { userId });

    const count = await prisma.teacherProfile.count({
      where: { userId },
    });

    const exists = count > 0;

    logger.debug("Teacher profile existence check", { userId, exists });

    return exists;
  }

  /**
   * Get basic teacher info (for quick lookups)
   *
   * @param userId - The user ID
   * @returns Basic teacher information
   * @throws NotFoundError if teacher not found
   */
  async getBasicInfo(userId: string): Promise<{
    id: string;
    staffNumber: string;
    fullName: string;
    email: string;
  }> {
    logger.debug("Fetching basic teacher info", { userId });

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        staffNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!teacher) {
      logger.warn("Teacher not found for basic info", { userId });
      throw new NotFoundError("Teacher not found");
    }

    const fullName = `${teacher.firstName} ${teacher.middleName || ""} ${teacher.lastName}`.trim();

    return {
      id: teacher.id,
      staffNumber: teacher.staffNumber,
      fullName,
      email: teacher.user.email,
    };
  }

  /**
   * Get list of subjects taught by this teacher
   *
   * @param userId - The user ID of the logged-in teacher
   * @returns Array of subjects the teacher teaches
   * @throws NotFoundError if teacher profile not found
   */
  async getTeacherSubjects(
    userId: string
  ): Promise<Array<{ id: string; name: string; code: string }>> {
    logger.info("Fetching teacher subjects", { userId });

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!teacherProfile) {
      logger.warn("Teacher profile not found", { userId });
      throw new NotFoundError("Teacher profile not found");
    }

    // Use a Set to deduplicate subjects (a teacher might teach the same subject in multiple classes)
    const subjectsMap = new Map<string, { id: string; name: string; code: string }>();

    teacherProfile.subjects.forEach((ts: any) => {
      if (!subjectsMap.has(ts.subject.id)) {
        subjectsMap.set(ts.subject.id, {
          id: ts.subject.id,
          name: ts.subject.name,
          code: ts.subject.code,
        });
      }
    });

    const subjects = Array.from(subjectsMap.values());

    logger.info("Teacher subjects fetched successfully", {
      userId,
      subjectCount: subjects.length,
    });

    return subjects;
  }
}

// Export singleton instance
export const teacherProfileService = new TeacherProfileService();
