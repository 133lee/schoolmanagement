import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/http/errors";
import { getHODDepartment } from "@/lib/auth/position-helpers";
import { GradeLevel } from "@/types/prisma-enums";

const SECONDARY_GRADES: GradeLevel[] = [
  GradeLevel.GRADE_8,
  GradeLevel.GRADE_9,
  GradeLevel.GRADE_10,
  GradeLevel.GRADE_11,
  GradeLevel.GRADE_12,
];

export interface DepartmentCurriculumFilters {
  classId?: string;
  unassignedOnly?: boolean;
  includeAssignments?: boolean;
  academicYearId?: string;
}

/**
 * HOD Curriculum Service
 *
 * Read-only views over ClassSubject (the curriculum source of truth) scoped
 * to the HOD's own department and to secondary grades (8-12), which is all
 * HODs are permitted to manage.
 */
export class HODCurriculumService {
  private async resolveDepartment(userId: string) {
    const hodDept = await getHODDepartment(userId);
    if (!hodDept) {
      throw new ForbiddenError("Not assigned as HOD of any department");
    }
    return hodDept;
  }

  private async resolveAcademicYearId(requested?: string): Promise<string> {
    if (requested) return requested;

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!activeYear) {
      throw new ValidationError("No active academic year found");
    }

    return activeYear.id;
  }

  async getDepartmentCurriculum(userId: string, filters: DepartmentCurriculumFilters) {
    const hodDept = await this.resolveDepartment(userId);
    const academicYearId = await this.resolveAcademicYearId(filters.academicYearId);
    const { classId, unassignedOnly, includeAssignments } = filters;

    const whereClause: Prisma.ClassSubjectWhereInput = {
      subject: { departmentId: hodDept.id, deletedAt: null },
      class: { status: "ACTIVE", grade: { level: { in: SECONDARY_GRADES } } },
    };

    if (classId) {
      whereClause.classId = classId;
    }

    if (unassignedOnly) {
      whereClause.subjectTeacherAssignments = { none: { academicYearId } };
    }

    const curriculumItems = await prisma.classSubject.findMany({
      where: whereClause,
      include: {
        subject: {
          select: { id: true, code: true, name: true, description: true, departmentId: true },
        },
        class: {
          select: {
            id: true,
            name: true,
            grade: { select: { id: true, name: true, level: true, sequence: true } },
          },
        },
        ...(includeAssignments && {
          subjectTeacherAssignments: {
            where: { academicYearId },
            include: {
              teacher: { select: { id: true, firstName: true, lastName: true, staffNumber: true } },
            },
          },
        }),
      },
      orderBy: [
        { class: { grade: { sequence: "asc" } } },
        { class: { name: "asc" } },
        { subject: { name: "asc" } },
      ],
    });

    const curriculum = curriculumItems.map((item) => {
      const assignments = includeAssignments
        ? (item as unknown as {
            subjectTeacherAssignments: {
              id: string;
              teacher: { id: string; firstName: string; lastName: string; staffNumber: string };
            }[];
          }).subjectTeacherAssignments
        : undefined;

      return {
        classSubjectId: item.id,
        isCore: item.isCore,
        periodsPerWeek: item.periodsPerWeek,
        subject: { id: item.subject.id, code: item.subject.code, name: item.subject.name },
        class: {
          id: item.class.id,
          name: item.class.name,
          grade: { id: item.class.grade.id, name: item.class.grade.name, level: item.class.grade.level },
        },
        ...(includeAssignments && {
          currentAssignment: assignments?.[0]
            ? {
                id: assignments[0].id,
                teacher: {
                  id: assignments[0].teacher.id,
                  name: `${assignments[0].teacher.firstName} ${assignments[0].teacher.lastName}`,
                  staffNumber: assignments[0].teacher.staffNumber,
                },
              }
            : null,
        }),
      };
    });

    const stats = {
      total: curriculum.length,
      assigned: includeAssignments
        ? curriculum.filter((c) => (c as { currentAssignment?: unknown }).currentAssignment).length
        : undefined,
      unassigned: includeAssignments
        ? curriculum.filter((c) => !(c as { currentAssignment?: unknown }).currentAssignment).length
        : undefined,
      totalPeriodsPerWeek: curriculum.reduce((sum, c) => sum + c.periodsPerWeek, 0),
    };

    const teachersInDept = await prisma.teacherProfile.findMany({
      where: {
        departments: { some: { departmentId: hodDept.id } },
        status: "ACTIVE",
        user: { isActive: true },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        staffNumber: true,
        phone: true,
        user: { select: { email: true } },
        subjectTeacherAssignments: {
          where: { academicYearId },
          include: { classSubject: { select: { periodsPerWeek: true } } },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    const teachers = teachersInDept.map((t) => {
      const periodsPerWeek = t.subjectTeacherAssignments.reduce(
        (sum, a) => sum + (a.classSubject?.periodsPerWeek || 5),
        0
      );

      return {
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        staffNumber: t.staffNumber || "",
        email: t.user?.email || "",
        phone: t.phone || "",
        departmentId: hodDept.id,
        periodsPerWeek,
        maxPeriodsPerWeek: 30,
        qualifiedSubjectIds: [] as string[],
      };
    });

    return {
      curriculum,
      teachers,
      stats,
      academicYearId,
      departmentId: hodDept.id,
      departmentName: hodDept.name,
    };
  }

  async getClassCurriculum(userId: string, classId: string, requestedAcademicYearId?: string) {
    const hodDept = await this.resolveDepartment(userId);
    const academicYearId = await this.resolveAcademicYearId(requestedAcademicYearId);

    const classEntity = await prisma.class.findUnique({
      where: { id: classId },
      include: { grade: true },
    });

    if (!classEntity) {
      throw new NotFoundError("Class not found");
    }

    if (!SECONDARY_GRADES.includes(classEntity.grade.level)) {
      throw new ForbiddenError("HOD can only manage curriculum for secondary grades (8-12)");
    }

    const curriculumItems = await prisma.classSubject.findMany({
      where: {
        classId,
        subject: { departmentId: hodDept.id, deletedAt: null },
      },
      include: {
        subject: { select: { id: true, code: true, name: true, description: true } },
        subjectTeacherAssignments: {
          where: { academicYearId },
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true, staffNumber: true } },
          },
        },
      },
      orderBy: { subject: { name: "asc" } },
    });

    const curriculum = curriculumItems.map((item) => ({
      classSubjectId: item.id,
      isCore: item.isCore,
      periodsPerWeek: item.periodsPerWeek,
      subject: {
        id: item.subject.id,
        code: item.subject.code,
        name: item.subject.name,
        description: item.subject.description,
      },
      currentAssignment: item.subjectTeacherAssignments[0]
        ? {
            id: item.subjectTeacherAssignments[0].id,
            teacher: {
              id: item.subjectTeacherAssignments[0].teacher.id,
              name: `${item.subjectTeacherAssignments[0].teacher.firstName} ${item.subjectTeacherAssignments[0].teacher.lastName}`,
              staffNumber: item.subjectTeacherAssignments[0].teacher.staffNumber,
            },
          }
        : null,
      isAssigned: item.subjectTeacherAssignments.length > 0,
    }));

    const stats = {
      total: curriculum.length,
      assigned: curriculum.filter((c) => c.isAssigned).length,
      unassigned: curriculum.filter((c) => !c.isAssigned).length,
      totalPeriodsPerWeek: curriculum.reduce((sum, c) => sum + c.periodsPerWeek, 0),
    };

    return {
      class: {
        id: classEntity.id,
        name: classEntity.name,
        grade: { id: classEntity.grade.id, name: classEntity.grade.name, level: classEntity.grade.level },
      },
      curriculum,
      stats,
      academicYearId,
      departmentId: hodDept.id,
      departmentName: hodDept.name,
    };
  }
}

export const hodCurriculumService = new HODCurriculumService();
