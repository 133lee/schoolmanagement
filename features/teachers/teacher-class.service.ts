import prisma from "@/lib/db/prisma";
import { NotFoundError, ForbiddenError } from "@/lib/http/errors";
import { logger } from "@/lib/logger/logger";
import { formatCompactClassLabel } from "@/lib/utils";
import { TeacherClassView, TeacherClassesResponse } from "./teacher-app.types";

export interface ClassListExportData {
  className: string;
  academicYear: string;
  subjectName?: string;
  students: Array<{
    studentNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    gender: string;
    dateOfBirth: Date;
    admissionDate: Date;
    status: string;
  }>;
}

/**
 * Teacher Class Service
 *
 * Business logic for teachers viewing their class assignments.
 * Handles both class teacher and subject teacher assignments.
 */
export class TeacherClassService {
  /**
   * Get all classes for a teacher
   *
   * @param userId - The user ID of the logged-in teacher
   * @returns All classes the teacher is assigned to
   */
  async getClassesForTeacher(userId: string): Promise<TeacherClassesResponse> {
    logger.info("Fetching classes for teacher", { userId });

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!teacherProfile) {
      logger.warn("Teacher profile not found", { userId });
      throw new NotFoundError("Teacher profile not found");
    }

    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!academicYear) {
      logger.info("No active academic year found - returning empty class lists", { userId });
      // Return empty response instead of throwing error
      // This is a valid state during system setup or between academic years
      return {
        classTeacherClasses: [],
        subjectTeacherClasses: [],
        allClasses: [],
      };
    }

    logger.debug("Active academic year found", {
      academicYearId: academicYear.id,
      year: academicYear.year,
    });

    // Get class teacher assignments
    const classTeacherAssignments = await prisma.classTeacherAssignment.findMany({
      where: {
        teacherId: teacherProfile.id,
        academicYearId: academicYear.id,
      },
      include: {
        class: {
          include: {
            grade: true,
          },
        },
      },
    });

    logger.debug("Class teacher assignments found", {
      count: classTeacherAssignments.length,
      teacherId: teacherProfile.id,
      academicYearId: academicYear.id,
      assignments: classTeacherAssignments.map(a => ({
        id: a.id,
        classId: a.classId,
        className: a.class.name,
        gradeName: a.class.grade.name,
      })),
    });

    // Get subject teacher assignments
    const subjectTeacherAssignments = await prisma.subjectTeacherAssignment.findMany({
      where: {
        teacherId: teacherProfile.id,
        academicYearId: academicYear.id,
      },
      include: {
        class: {
          include: {
            grade: true,
          },
        },
        subject: true,
      },
    });

    logger.debug("Subject teacher assignments found", {
      total: subjectTeacherAssignments.length,
    });

    // Group this teacher's own subject-teacher assignments by class, so a
    // class teacher's own subject(s) for their own class can be resolved from
    // one already-fetched, deterministically-ordered source instead of a
    // second query that could disagree with itself between calls.
    const ownSubjectAssignmentsByClassId = new Map<string, typeof subjectTeacherAssignments>();
    for (const a of subjectTeacherAssignments) {
      const existing = ownSubjectAssignmentsByClassId.get(a.classId);
      if (existing) existing.push(a);
      else ownSubjectAssignmentsByClassId.set(a.classId, [a]);
    }

    // Format class teacher classes — every subject this teacher personally
    // teaches within their own class surfaces here (see formatClassTeacherClass),
    // not just one.
    const classTeacherClasses = await Promise.all(
      classTeacherAssignments.map(async (assignment) =>
        this.formatClassTeacherClass(
          assignment,
          ownSubjectAssignmentsByClassId.get(assignment.classId) ?? []
        )
      )
    );

    // The Subject Teacher tab is strictly for classes where this teacher is
    // ONLY a subject teacher — never also the class teacher. If they're the
    // class teacher of a class, every subject they teach there belongs on the
    // Class Teacher side (handled above), not here, regardless of how many
    // subjects that is.
    const classTeacherClassIds = new Set(classTeacherAssignments.map((a) => a.classId));
    const subjectOnlyAssignments = subjectTeacherAssignments.filter(
      (a) => !classTeacherClassIds.has(a.classId)
    );

    const subjectTeacherClasses = await Promise.all(
      subjectOnlyAssignments.map((assignment) =>
        this.formatSubjectTeacherClass(assignment, academicYear.id)
      )
    );

    // Combine both lists, avoiding duplicates
    const allClasses = [
      ...classTeacherClasses,
      ...subjectTeacherClasses.filter(
        (sc) => !classTeacherClasses.some((ct) => ct.id === sc.id)
      ),
    ];

    logger.info("Classes fetched successfully", {
      userId,
      classTeacherCount: classTeacherClasses.length,
      subjectTeacherCount: subjectTeacherClasses.length,
      subjectAssignmentsFiltered: subjectTeacherAssignments.length - subjectOnlyAssignments.length,
      totalUniqueClasses: allClasses.length,
    });

    return {
      classTeacherClasses,
      subjectTeacherClasses,
      allClasses,
    };
  }

  /**
   * Format class teacher assignment to TeacherClassView
   *
   * @param assignment - Class teacher assignment with relations
   * @param ownSubjectAssignments - This teacher's own subject-teacher
   *   assignments for this same class (already fetched by the caller — a
   *   class teacher can personally teach more than one subject in their own
   *   class, e.g. Math and English, and all of them belong here).
   * @returns Formatted TeacherClassView
   */
  private async formatClassTeacherClass(
    assignment: any,
    ownSubjectAssignments: Array<{ subject: { id: string; name: string; code: string } }>
  ): Promise<TeacherClassView> {
    // For PRIMARY grades, class teacher teaches all subjects
    // For SECONDARY grades, list whichever specific subject(s) they teach
    const isPrimary = assignment.class.grade.schoolLevel === "PRIMARY";

    let teachingSubject = "All Subjects"; // Default for primary
    let teachingSubjectId: string | undefined = undefined;
    let teachingSubjectCode: string | undefined = undefined;
    let teachingSubjects: Array<{ id: string; name: string; code: string }> | undefined = undefined;

    if (!isPrimary) {
      teachingSubjects = ownSubjectAssignments.map((a) => ({ id: a.subject.id, name: a.subject.name, code: a.subject.code }));
      // Kept for existing single-subject consumers (e.g. subject analysis) —
      // the first subject when there's more than one.
      teachingSubject = teachingSubjects.length > 0
        ? teachingSubjects.map((s) => s.name).join(", ")
        : "—";
      teachingSubjectId = teachingSubjects[0]?.id;
      teachingSubjectCode = teachingSubjects[0]?.code;
    }

    // Get actual student count from enrollments (source of truth)
    const actualStudentCount = await prisma.studentClassEnrollment.count({
      where: {
        classId: assignment.classId,
        academicYearId: assignment.academicYearId,
      },
    });

    logger.debug("Formatted class teacher class", {
      classId: assignment.classId,
      isPrimary,
      teachingSubject,
      actualStudentCount,
    });

    return {
      id: assignment.classId,
      name: formatCompactClassLabel(assignment.class.grade.name, assignment.class.name),
      gradeLevel: assignment.class.grade.name,
      totalStudents: actualStudentCount,
      capacity: assignment.class.capacity,
      isClassTeacher: true,
      teachingSubject,
      teachingSubjectId, // First subject's id — kept for existing single-subject consumers
      teachingSubjectCode, // First subject's code — kept for existing single-subject consumers
      teachingSubjects, // All subjects this class teacher personally teaches here (secondary only)
      status: assignment.class.status,
    };
  }

  /**
   * Format subject teacher assignment to TeacherClassView
   *
   * @param assignment - Subject teacher assignment with relations
   * @param academicYearId - The academic year ID
   * @returns Formatted TeacherClassView
   */
  private async formatSubjectTeacherClass(
    assignment: any,
    academicYearId: string
  ): Promise<TeacherClassView> {
    // Get actual student count from enrollments (source of truth)
    const actualStudentCount = await prisma.studentClassEnrollment.count({
      where: {
        classId: assignment.classId,
        academicYearId,
      },
    });

    return {
      id: assignment.classId,
      name: formatCompactClassLabel(assignment.class.grade.name, assignment.class.name),
      gradeLevel: assignment.class.grade.name,
      totalStudents: actualStudentCount,
      capacity: assignment.class.capacity,
      isClassTeacher: false,
      teachingSubject: assignment.subject.name,
      teachingSubjectId: assignment.subject.id, // Include subjectId for subject analysis
      teachingSubjectCode: assignment.subject.code,
      status: assignment.class.status,
    };
  }

  /**
   * Get a specific class for a teacher
   *
   * @param userId - The user ID of the teacher
   * @param classId - The class ID
   * @returns Class details if teacher has access
   * @throws NotFoundError if class not found or teacher has no access
   */
  async getClassForTeacher(userId: string, classId: string): Promise<TeacherClassView> {
    logger.info("Fetching specific class for teacher", { userId, classId });

    const classes = await this.getClassesForTeacher(userId);

    const classView = classes.allClasses.find((c) => c.id === classId);

    if (!classView) {
      logger.warn("Class not found or teacher has no access", { userId, classId });
      throw new NotFoundError("Class not found or you do not have access to this class");
    }

    logger.info("Class fetched successfully", { userId, classId });

    return classView;
  }

  /**
   * Check if teacher is class teacher for any class
   *
   * @param userId - The user ID of the teacher
   * @returns True if teacher is a class teacher
   */
  async isClassTeacher(userId: string): Promise<boolean> {
    logger.debug("Checking if teacher is class teacher", { userId });

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!teacherProfile) {
      throw new NotFoundError("Teacher profile not found");
    }

    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!academicYear) {
      throw new NotFoundError("No active academic year found");
    }

    const assignment = await prisma.classTeacherAssignment.findFirst({
      where: {
        teacherId: teacherProfile.id,
        academicYearId: academicYear.id,
      },
    });

    const result = !!assignment;

    logger.debug("Class teacher check result", { userId, isClassTeacher: result });

    return result;
  }

  /**
   * Verify the teacher's access to a class (as class teacher or subject
   * teacher, depending on mode) and gather everything needed to render a
   * class-list PDF export.
   *
   * @param subjectId - Which subject to label the export with, when `mode`
   *   is "subject". A teacher can teach the same class under two different
   *   subjects (two separate SubjectTeacherAssignment rows), so this must
   *   be passed explicitly rather than resolved with `findFirst` — without
   *   it, the export would always resolve to whichever assignment Prisma
   *   happened to return first, silently ignoring the other subject.
   */
  async getClassListForExport(
    userId: string,
    classId: string,
    mode: "class" | "subject",
    subjectId?: string
  ): Promise<ClassListExportData> {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!teacherProfile) {
      throw new NotFoundError("Teacher profile not found");
    }

    const academicYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    if (!academicYear) {
      throw new NotFoundError("No active academic year found");
    }

    let subjectName = "";

    if (mode === "class") {
      const classTeacherAssignment = await prisma.classTeacherAssignment.findFirst({
        where: { teacherId: teacherProfile.id, classId, academicYearId: academicYear.id },
      });
      if (!classTeacherAssignment) {
        throw new ForbiddenError("You are not the class teacher for this class");
      }
    } else {
      const subjectTeacherAssignment = await prisma.subjectTeacherAssignment.findFirst({
        where: {
          teacherId: teacherProfile.id,
          classId,
          academicYearId: academicYear.id,
          ...(subjectId && { subjectId }),
        },
        include: { subject: true },
      });
      if (!subjectTeacherAssignment) {
        throw new ForbiddenError("You do not teach any subject in this class");
      }
      subjectName = subjectTeacherAssignment.subject.name;
    }

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: { grade: true },
    });
    if (!classData) {
      throw new NotFoundError("Class not found");
    }

    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: { classId, academicYearId: academicYear.id, status: "ACTIVE" },
      include: { student: true },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    });
    if (enrollments.length === 0) {
      throw new NotFoundError("No students found in this class");
    }

    return {
      className: formatCompactClassLabel(classData.grade.name, classData.name),
      academicYear: String(academicYear.year),
      subjectName: subjectName || undefined,
      students: enrollments.map((e) => ({
        studentNumber: e.student.studentNumber,
        firstName: e.student.firstName,
        middleName: e.student.middleName,
        lastName: e.student.lastName,
        gender: e.student.gender,
        dateOfBirth: e.student.dateOfBirth,
        admissionDate: e.student.admissionDate,
        status: e.student.status,
      })),
    };
  }
}

// Export singleton instance
export const teacherClassService = new TeacherClassService();
