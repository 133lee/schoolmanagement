import prisma from "@/lib/db/prisma";
import { NotFoundError, ForbiddenError } from "@/lib/http/errors";
import { logger } from "@/lib/logger/logger";
import {
  StudentView,
  ClassView,
  ClassWithStudents,
  ClassTeacherStudentsResponse,
  SubjectTeacherStudentsResponse,
  TeacherStudentsResponse,
} from "./teacher-app.types";

/**
 * Teacher Student Service
 *
 * Business logic for teachers viewing their students.
 * Handles both class teacher and subject teacher views.
 */
export class TeacherStudentService {
  /**
   * Get students for a teacher based on their role
   *
   * @param userId - The user ID of the logged-in teacher
   * @param view - View type: "class-teacher" or "subject-teacher"
   * @param classId - Optional class ID filter for subject teacher view
   * @returns Students data based on the teacher's role
   */
  async getStudentsForTeacher(
    userId: string,
    view: "class-teacher" | "subject-teacher" = "class-teacher",
    classId?: string | null
  ): Promise<TeacherStudentsResponse> {
    logger.info("Fetching students for teacher", { userId, view, classId });

    // Get the teacher's profile
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!teacher) {
      logger.warn("Teacher profile not found", { userId });
      throw new NotFoundError("Teacher profile not found");
    }

    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      select: { id: true, year: true },
    });

    if (!academicYear) {
      logger.warn("No active academic year found");
      throw new NotFoundError("No active academic year found");
    }

    logger.debug("Active academic year found", {
      academicYearId: academicYear.id,
      year: academicYear.year,
    });

    if (view === "class-teacher") {
      return this.getClassTeacherStudents(teacher.id, academicYear.id);
    } else {
      return this.getSubjectTeacherStudents(teacher.id, academicYear.id, classId);
    }
  }

  /**
   * Get students for class teacher view
   *
   * @param teacherId - The teacher profile ID
   * @param academicYearId - The active academic year ID
   * @returns Class teacher students response
   */
  private async getClassTeacherStudents(
    teacherId: string,
    academicYearId: string
  ): Promise<ClassTeacherStudentsResponse> {
    logger.debug("Fetching class teacher students", { teacherId, academicYearId });

    const classTeacherAssignment = await prisma.classTeacherAssignment.findFirst({
      where: {
        teacherId,
        academicYearId,
      },
      include: {
        class: {
          include: {
            grade: true,
            enrollments: {
              where: {
                academicYearId,
              },
              include: {
                student: {
                  include: {
                    studentGuardians: {
                      take: 1,
                      include: {
                        guardian: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!classTeacherAssignment) {
      logger.info("No class teacher assignment found", { teacherId, academicYearId });
      return {
        view: "class-teacher",
        class: null,
        students: [],
      };
    }

    const students = this.mapStudentsToView(classTeacherAssignment.class.enrollments);

    const classView: ClassView = {
      id: classTeacherAssignment.class.id,
      name: classTeacherAssignment.class.name,
      grade: classTeacherAssignment.class.grade.name,
      gradeLevel: classTeacherAssignment.class.grade.level,
      capacity: classTeacherAssignment.class.capacity,
      enrolled: classTeacherAssignment.class.enrollments.length,
    };

    logger.info("Class teacher students fetched successfully", {
      teacherId,
      classId: classView.id,
      studentCount: students.length,
    });

    return {
      view: "class-teacher",
      class: classView,
      students,
    };
  }

  /**
   * Get students for subject teacher view
   *
   * @param teacherId - The teacher profile ID
   * @param academicYearId - The active academic year ID
   * @param classId - Optional class ID filter
   * @returns Subject teacher students response
   */
  private async getSubjectTeacherStudents(
    teacherId: string,
    academicYearId: string,
    classId?: string | null
  ): Promise<SubjectTeacherStudentsResponse> {
    logger.debug("Fetching subject teacher students", {
      teacherId,
      academicYearId,
      classId,
    });

    const subjectTeacherAssignments = await prisma.subjectTeacherAssignment.findMany({
      where: {
        teacherId,
        academicYearId,
        ...(classId ? { classId } : {}),
      },
      include: {
        class: {
          include: {
            grade: true,
            enrollments: {
              where: {
                academicYearId,
              },
              include: {
                student: {
                  include: {
                    studentGuardians: {
                      take: 1,
                      include: {
                        guardian: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        subject: true,
      },
    });

    const classes = subjectTeacherAssignments.map((assignment) => {
      const students = this.mapStudentsToView(assignment.class.enrollments);

      const classWithStudents: ClassWithStudents = {
        id: assignment.class.id,
        name: assignment.class.name,
        grade: assignment.class.grade.name,
        gradeLevel: assignment.class.grade.level,
        subject: assignment.subject.name,
        subjectCode: assignment.subject.code,
        subjectId: assignment.subject.id,
        capacity: assignment.class.capacity,
        enrolled: assignment.class.enrollments.length,
        students,
      };

      return classWithStudents;
    });

    logger.info("Subject teacher students fetched successfully", {
      teacherId,
      classCount: classes.length,
      totalStudents: classes.reduce((sum, c) => sum + c.students.length, 0),
    });

    return {
      view: "subject-teacher",
      classes,
      selectedClassId: classId,
    };
  }

  /**
   * Map enrollments to StudentView format
   *
   * @param enrollments - Array of enrollments with student data
   * @returns Array of StudentView objects
   */
  private mapStudentsToView(enrollments: any[]): StudentView[] {
    return enrollments.map((enrollment) => ({
      id: enrollment.student.id,
      studentNumber: enrollment.student.studentNumber,
      firstName: enrollment.student.firstName,
      middleName: enrollment.student.middleName,
      lastName: enrollment.student.lastName,
      fullName: `${enrollment.student.firstName} ${enrollment.student.middleName || ""} ${enrollment.student.lastName}`.trim(),
      gender: enrollment.student.gender,
      dateOfBirth: enrollment.student.dateOfBirth,
      status: enrollment.student.status,
      vulnerability: enrollment.student.vulnerability,
      hasGuardian: enrollment.student.studentGuardians.length > 0,
      guardianName: enrollment.student.studentGuardians[0]
        ? `${enrollment.student.studentGuardians[0].guardian.firstName} ${enrollment.student.studentGuardians[0].guardian.lastName}`
        : null,
    }));
  }

  /**
   * Verify teacher has access to a specific class
   *
   * @param userId - The user ID of the teacher
   * @param classId - The class ID to check access for
   * @returns True if teacher has access
   * @throws ForbiddenError if teacher doesn't have access
   */
  async verifyTeacherClassAccess(userId: string, classId: string): Promise<boolean> {
    logger.debug("Verifying teacher class access", { userId, classId });

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!teacher) {
      throw new NotFoundError("Teacher profile not found");
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!academicYear) {
      throw new NotFoundError("No active academic year found");
    }

    // Check if teacher is class teacher for this class
    const classTeacherAssignment = await prisma.classTeacherAssignment.findFirst({
      where: {
        teacherId: teacher.id,
        classId,
        academicYearId: academicYear.id,
      },
    });

    if (classTeacherAssignment) {
      logger.debug("Teacher has class teacher access", { teacherId: teacher.id, classId });
      return true;
    }

    // Check if teacher is subject teacher for this class
    const subjectTeacherAssignment = await prisma.subjectTeacherAssignment.findFirst({
      where: {
        teacherId: teacher.id,
        classId,
        academicYearId: academicYear.id,
      },
    });

    if (subjectTeacherAssignment) {
      logger.debug("Teacher has subject teacher access", { teacherId: teacher.id, classId });
      return true;
    }

    logger.warn("Teacher does not have access to class", { teacherId: teacher.id, classId });
    throw new ForbiddenError("You do not have access to this class");
  }

  /**
   * Get students for a specific class (for class roster view)
   *
   * @param userId - The user ID of the teacher
   * @param classId - The class ID to get students for
   * @returns Array of students enrolled in the class
   * @throws ForbiddenError if teacher doesn't have access
   */
  async getStudentsForClass(
    userId: string,
    classId: string
  ): Promise<{ students: Array<{ id: string; name: string; gender: string; age: number }>; total: number }> {
    logger.info("Fetching students for specific class", { userId, classId });

    // Verify teacher has access (this throws ForbiddenError if not)
    await this.verifyTeacherClassAccess(userId, classId);

    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!academicYear) {
      throw new NotFoundError("No active academic year found");
    }

    // Get students enrolled in this class
    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: {
        classId: classId,
        academicYearId: academicYear.id,
        status: "ACTIVE",
      },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
      },
      orderBy: {
        student: {
          lastName: "asc",
        },
      },
    });

    // Format student data
    const students = enrollments.map((enrollment) => {
      const student = enrollment.student;
      const age = Math.floor(
        (Date.now() - new Date(student.dateOfBirth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      );

      // Construct full name including middle name for consistency
      const fullName = [student.firstName, student.middleName, student.lastName]
        .filter(Boolean)
        .join(" ");

      return {
        id: student.id,
        name: fullName,
        gender: student.gender === "MALE" ? "M" : "F",
        age: age,
      };
    });

    logger.info("Students fetched for class successfully", {
      userId,
      classId,
      studentCount: students.length,
    });

    return {
      students,
      total: students.length,
    };
  }
}

// Export singleton instance
export const teacherStudentService = new TeacherStudentService();
