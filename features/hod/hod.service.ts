import prisma from "@/lib/db/prisma";
import { StaffStatus, Gender, QualificationLevel, ClassStatus, type Prisma } from "@prisma/client";
import { getHODDepartment } from "@/lib/auth/position-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/http/errors";

/**
 * HOD Service
 *
 * Provides department-scoped data access for HOD users.
 * All methods filter data based on the HOD's department.
 */

interface TeacherFilters {
  status?: StaffStatus;
  gender?: Gender;
  qualification?: QualificationLevel;
  search?: string;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

export class HodService {
  /**
   * Get HOD's department ID
   *
   * Lookup path: User → TeacherProfile → Department (where hodTeacherId = teacherProfile.id)
   * HOD is a derived role, not a User relation
   */
  private async getHodDepartmentId(userId: string): Promise<string> {
    // First, get the teacher profile
    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!teacher) {
      throw new Error("Teacher profile not found");
    }

    // Then, find the department where this teacher is the HOD
    const department = await prisma.department.findFirst({
      where: {
        hodTeacherId: teacher.id,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (!department) {
      throw new Error("User is not an HOD of any active department");
    }

    return department.id;
  }

  /**
   * Get all teachers in HOD's department without pagination (for dropdowns/selectors)
   * Includes the HOD themselves
   */
  async getAllTeachers(
    userId: string,
    filters?: TeacherFilters
  ) {
    const departmentId = await this.getHodDepartmentId(userId);

    // Get HOD's teacher profile ID to include them in results
    const hodTeacher = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    // Build where clause (same as getTeachers)
    const where: Prisma.TeacherProfileWhereInput = {
      deletedAt: null,
      OR: [
        {
          departments: {
            some: {
              departmentId: departmentId,
            },
          },
        },
        ...(hodTeacher ? [{ id: hodTeacher.id }] : []),
      ],
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.gender) {
      where.gender = filters.gender;
    }

    if (filters?.qualification) {
      where.qualification = filters.qualification;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { staffNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return await prisma.teacherProfile.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            isActive: true,
          },
        },
        departments: {
          include: {
            department: true,
          },
        },
        subjects: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  }

  /**
   * Get teachers in HOD's department
   * Includes the HOD themselves
   */
  async getTeachers(
    userId: string,
    filters?: TeacherFilters,
    pagination?: PaginationParams
  ) {
    const departmentId = await this.getHodDepartmentId(userId);

    // Get HOD's teacher profile ID to include them in results
    const hodTeacher = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    // Build where clause for teachers in this department
    // Include teachers who are either:
    // 1. Members of the department (via TeacherDepartment), OR
    // 2. The HOD themselves
    const where: Prisma.TeacherProfileWhereInput = {
      deletedAt: null,
      OR: [
        {
          departments: {
            some: {
              departmentId: departmentId,
            },
          },
        },
        ...(hodTeacher ? [{ id: hodTeacher.id }] : []),
      ],
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.gender) {
      where.gender = filters.gender;
    }

    if (filters?.qualification) {
      where.qualification = filters.qualification;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { staffNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await prisma.teacherProfile.count({ where });

    // Get teachers with their assigned subjects
    const teachers = await prisma.teacherProfile.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            isActive: true,
          },
        },
        departments: {
          where: {
            departmentId: departmentId,
          },
          include: {
            department: {
              select: {
                name: true,
                code: true,
              },
            },
          },
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
      },
      orderBy: [
        { lastName: "asc" },
        { firstName: "asc" },
      ],
      skip,
      take: pageSize,
    });

    return {
      data: teachers,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get all subjects in HOD's department without pagination (for dropdowns/selectors)
   */
  async getAllSubjects(
    userId: string,
    search?: string
  ) {
    const departmentId = await this.getHodDepartmentId(userId);

    const where: Prisma.SubjectWhereInput = {
      departmentId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    return await prisma.subject.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        teacherSubjects: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  /**
   * Get subjects in HOD's department
   */
  async getSubjects(
    userId: string,
    search?: string,
    pagination?: PaginationParams
  ) {
    const departmentId = await this.getHodDepartmentId(userId);

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SubjectWhereInput = {
      departmentId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count
    const total = await prisma.subject.count({ where });

    // Get subjects with department and assigned teachers
    const subjects = await prisma.subject.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        teacherSubjects: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      skip,
      take: pageSize,
    });

    return {
      data: subjects,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get classes filtered to secondary grades (8-12) only
   *
   * Note: Classes are NOT department-scoped. HOD sees all secondary classes
   * because they assign their department's subjects to teachers for these classes.
   * The department scoping happens at the assignment level, not the class level.
   */
  async getClasses(
    userId: string,
    filters?: {
      status?: ClassStatus;
      gradeId?: string;
      search?: string;
    },
    pagination?: PaginationParams
  ) {
    // Verify user is an HOD (throws if not)
    await this.getHodDepartmentId(userId);

    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    // Build where clause - filter to SECONDARY school level
    const where: Prisma.ClassWhereInput = {
      grade: {
        schoolLevel: "SECONDARY",
      },
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.gradeId) {
      where.gradeId = filters.gradeId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { grade: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    // Get total count
    const total = await prisma.class.count({ where });

    // Get classes with grade, class teacher, and enrollment count
    const classes = await prisma.class.findMany({
      where,
      include: {
        grade: {
          select: {
            id: true,
            name: true,
            level: true,
            schoolLevel: true,
            sequence: true,
          },
        },
        classTeacherAssignments: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          take: 1, // Only need current class teacher
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: [
        { grade: { sequence: "asc" } },
        { name: "asc" },
      ],
      skip,
      take: pageSize,
    });

    // Transform to include currentEnrolled
    const data = classes.map((classItem) => ({
      ...classItem,
      currentEnrolled: classItem._count?.enrollments || 0,
    }));

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Department performance overview for the logged-in HOD: overall average,
   * pass rate, and best/weakest performing subject.
   */
  async getPerformanceOverview(
    userId: string,
    filters: { subjectId?: string; termId?: string; academicYearId?: string }
  ) {
    const hodDepartment = await getHODDepartment(userId);
    if (!hodDepartment) {
      throw new ForbiddenError("Access denied: User is not assigned as HOD");
    }

    const department = await prisma.department.findUnique({
      where: { id: hodDepartment.id },
      include: { subjects: true },
    });
    if (!department) {
      throw new NotFoundError("Department not found");
    }

    const allSubjectIds = department.subjects.map((s) => s.id);
    const subjectIds =
      filters.subjectId && allSubjectIds.includes(filters.subjectId)
        ? [filters.subjectId]
        : allSubjectIds;

    // Resolve the term filter: explicit termId > academicYearId (all terms in year) > active term
    let termFilter: { termId?: string; termIds?: string[] } = {};
    if (filters.termId) {
      termFilter = { termId: filters.termId };
    } else if (filters.academicYearId) {
      const yearTerms = await prisma.term.findMany({
        where: { academicYearId: filters.academicYearId },
        select: { id: true },
      });
      termFilter = { termIds: yearTerms.map((t) => t.id) };
    } else {
      const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
      const activeTerm = activeYear
        ? await prisma.term.findFirst({ where: { academicYearId: activeYear.id, isActive: true } })
        : null;
      if (activeTerm) {
        termFilter = { termId: activeTerm.id };
      }
    }

    const assessmentWhere: Record<string, unknown> = { subjectId: { in: subjectIds } };
    if (termFilter.termId) {
      assessmentWhere.termId = termFilter.termId;
    } else if (termFilter.termIds?.length) {
      assessmentWhere.termId = { in: termFilter.termIds };
    }

    const assessments = await prisma.assessment.findMany({
      where: assessmentWhere,
      include: { subject: { select: { name: true } } },
    });
    const assessmentIds = assessments.map((a) => a.id);

    const results = await prisma.studentAssessmentResult.findMany({
      where: { assessmentId: { in: assessmentIds } },
      include: {
        assessment: {
          select: { totalMarks: true, subject: { select: { name: true } } },
        },
      },
    });

    let averagePerformance = 0;
    if (results.length > 0) {
      const totalPct = results.reduce(
        (sum, r) => sum + (r.marksObtained! / r.assessment.totalMarks) * 100,
        0
      );
      averagePerformance = Math.round(totalPct / results.length);
    }

    const passedCount = results.filter(
      (r) => (r.marksObtained! / r.assessment.totalMarks) * 100 >= 50
    ).length;
    const passRate = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0;

    const subjectPerf: Record<string, { total: number; count: number }> = {};
    results.forEach((r) => {
      const name = r.assessment.subject.name;
      const pct = (r.marksObtained! / r.assessment.totalMarks) * 100;
      if (!subjectPerf[name]) subjectPerf[name] = { total: 0, count: 0 };
      subjectPerf[name].total += pct;
      subjectPerf[name].count += 1;
    });

    const sorted = Object.entries(subjectPerf)
      .map(([name, d]) => ({ name, average: Math.round(d.total / d.count) }))
      .sort((a, b) => b.average - a.average);

    return {
      averagePerformance,
      passRate,
      bestPerformingSubject: sorted[0] ?? null,
      subjectNeedingAttention: sorted.length > 1 ? sorted[sorted.length - 1] : null,
      totalResults: results.length,
    };
  }

  /**
   * Full department dashboard for the logged-in HOD: department summary,
   * performance overview, assessment stats, subjects, and teacher roster.
   */
  async getDashboard(userId: string) {
    const hodDepartment = await getHODDepartment(userId);
    if (!hodDepartment) {
      throw new ForbiddenError("Access denied: User is not assigned as HOD of any department");
    }

    const department = await prisma.department.findUnique({
      where: { id: hodDepartment.id },
      include: {
        subjects: true,
        teachers: {
          where: { teacher: { status: "ACTIVE" } },
          include: { teacher: { include: { user: { select: { email: true, isActive: true } } } } },
        },
      },
    });
    if (!department) {
      throw new NotFoundError("Department not found");
    }

    const academicYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    if (!academicYear) {
      throw new NotFoundError("No active academic year found");
    }

    const activeTerm = await prisma.term.findFirst({
      where: { academicYearId: academicYear.id, isActive: true },
    });

    const subjectIds = department.subjects.map((s) => s.id);

    const subjectTeacherAssignments = await prisma.subjectTeacherAssignment.findMany({
      where: { subjectId: { in: subjectIds }, academicYearId: academicYear.id },
      include: {
        class: { select: { id: true, name: true, capacity: true, grade: { select: { name: true } } } },
      },
      distinct: ["classId"],
    });

    const uniqueClasses = Array.from(
      new Map(subjectTeacherAssignments.map((a) => [a.classId, a.class])).values()
    );

    const classIds = uniqueClasses.map((cls) => cls.id);
    const totalStudents = await prisma.studentClassEnrollment.count({
      where: { classId: { in: classIds }, status: "ACTIVE" },
    });

    const assessments = await prisma.assessment.findMany({
      where: { subjectId: { in: subjectIds }, termId: activeTerm?.id },
      include: { subject: { select: { name: true } } },
    });

    const totalAssessments = assessments.length;
    const pendingAssessments = assessments.filter((a) => a.status === "DRAFT").length;
    const assessmentIds = assessments.map((a) => a.id);

    const results = await prisma.studentAssessmentResult.findMany({
      where: { assessmentId: { in: assessmentIds } },
      include: { assessment: { select: { totalMarks: true, subject: { select: { name: true } } } } },
    });

    let averagePerformance = 0;
    if (results.length > 0) {
      const totalPercentage = results.reduce(
        (sum, result) => sum + (result.marksObtained / result.assessment.totalMarks) * 100,
        0
      );
      averagePerformance = Math.round(totalPercentage / results.length);
    }

    const passedResults = results.filter(
      (result) => (result.marksObtained / result.assessment.totalMarks) * 100 >= 50
    );
    const passRate = results.length > 0 ? Math.round((passedResults.length / results.length) * 100) : 0;

    const subjectPerformance: Record<string, { total: number; count: number }> = {};
    results.forEach((result) => {
      const subjectName = result.assessment.subject.name;
      const percentage = (result.marksObtained / result.assessment.totalMarks) * 100;
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = { total: 0, count: 0 };
      }
      subjectPerformance[subjectName].total += percentage;
      subjectPerformance[subjectName].count += 1;
    });

    const subjectAverages = Object.entries(subjectPerformance).map(([name, data]) => ({
      name,
      average: Math.round(data.total / data.count),
    }));

    const sortedSubjects = [...subjectAverages].sort((a, b) => b.average - a.average);
    const bestPerformingSubject = sortedSubjects[0] || null;
    const subjectNeedingAttention = sortedSubjects[sortedSubjects.length - 1] || null;

    const teachersData = department.teachers.map((td) => ({
      id: td.teacher.id,
      firstName: td.teacher.firstName,
      lastName: td.teacher.lastName,
      staffNumber: td.teacher.staffNumber,
      email: td.teacher.user.email,
      isActive: td.teacher.user.isActive,
    }));

    return {
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
        description: department.description,
        totalSubjects: department.subjects.length,
        totalTeachers: teachersData.length,
        totalStudents,
        activeClasses: uniqueClasses.length,
      },
      performance: { averagePerformance, passRate, bestPerformingSubject, subjectNeedingAttention },
      stats: {
        totalAssessments,
        pendingAssessments,
        activeClasses: uniqueClasses.length,
        totalStudents,
      },
      subjects: department.subjects.map((s) => ({ id: s.id, name: s.name, code: s.code })),
      teachers: teachersData,
      academicYear: { id: academicYear.id, year: academicYear.year },
      term: activeTerm
        ? {
            id: activeTerm.id,
            termType: activeTerm.termType,
            name: `Term ${activeTerm.termType.replace("TERM_", "")}`,
          }
        : null,
    };
  }

  /**
   * Get the complete profile for the logged-in HOD: user info + department
   * info + department statistics (subjects, teachers).
   *
   * departmentAsHOD lives on TeacherProfile, not User — this goes through
   * User.profile.departmentAsHOD rather than a (nonexistent) direct relation.
   */
  async getProfile(userId: string) {
    const hodUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        hasDefaultPassword: true,
        lastLogin: true,
        createdAt: true,
        profile: {
          select: {
            departmentAsHOD: {
              select: {
                id: true,
                name: true,
                code: true,
                description: true,
                status: true,
                createdAt: true,
                subjects: {
                  where: { deletedAt: null },
                  select: { id: true, name: true, code: true },
                  orderBy: { name: "asc" },
                },
                teachers: {
                  where: { teacher: { status: StaffStatus.ACTIVE } },
                  select: {
                    teacher: {
                      select: {
                        id: true,
                        staffNumber: true,
                        firstName: true,
                        lastName: true,
                        qualification: true,
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

    if (!hodUser) {
      throw new NotFoundError("User not found");
    }

    const departmentAsHOD = hodUser.profile?.departmentAsHOD;

    if (!departmentAsHOD) {
      throw new NotFoundError(
        "You are not assigned to any department. Please contact the administrator to assign you to a department as the Head of Department."
      );
    }

    return {
      id: hodUser.id,
      email: hodUser.email,
      role: hodUser.role,
      hasDefaultPassword: hodUser.hasDefaultPassword,
      lastLogin: hodUser.lastLogin,
      createdAt: hodUser.createdAt,
      department: {
        id: departmentAsHOD.id,
        name: departmentAsHOD.name,
        code: departmentAsHOD.code,
        description: departmentAsHOD.description,
        status: departmentAsHOD.status,
        createdAt: departmentAsHOD.createdAt,
        totalSubjects: departmentAsHOD.subjects.length,
        totalTeachers: departmentAsHOD.teachers.length,
        subjects: departmentAsHOD.subjects,
        teachers: departmentAsHOD.teachers.map((t) => t.teacher),
      },
    };
  }

  /**
   * Get subjects a specific teacher is qualified to teach, restricted to
   * subjects in the HOD's own department. Allowed for teachers in the
   * department, or the HOD themselves (being HOD doesn't itself grant a
   * teaching qualification, so this still filters through TeacherSubject).
   */
  async getTeacherSubjects(userId: string, teacherId: string) {
    const hodDept = await getHODDepartment(userId);
    if (!hodDept) {
      throw new ForbiddenError("Not assigned as HOD of any department");
    }

    const hodTeacher = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const teacher = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        departments: {
          where: { departmentId: hodDept.id },
          select: { departmentId: true },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundError("Teacher not found");
    }

    const isInDepartment = teacher.departments.length > 0;
    const isHOD = hodTeacher?.id === teacherId;

    if (!isInDepartment && !isHOD) {
      throw new ForbiddenError("Teacher does not belong to your department");
    }

    const teacherSubjects = await prisma.teacherSubject.findMany({
      where: {
        teacherId,
        subject: { departmentId: hodDept.id, deletedAt: null },
      },
      include: {
        subject: { select: { id: true, name: true, code: true, departmentId: true } },
      },
      orderBy: { subject: { name: "asc" } },
    });

    return teacherSubjects.map((ts) => ts.subject);
  }
}

export const hodService = new HodService();
