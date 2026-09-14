import prisma from "@/lib/db/prisma";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/http/errors";
import { getHODDepartment } from "@/lib/auth/position-helpers";
import { ExamType } from "@/types/prisma-enums";
import { formatCompactClassLabel } from "@/lib/utils";
import {
  TeacherAssessmentEntry,
  AssessmentDashboardStats,
  AssessmentEntryStatus,
} from "@/types/hod-assessment";

export interface AssessmentEntriesFilters {
  termId?: string;
  assessmentType?: string;
  classId?: string;
  teacherId?: string;
  status?: string;
}

/**
 * HOD Assessment Entries Service
 *
 * Tracks how far each teacher in the HOD's department has progressed
 * entering marks for their assessments, and lets the HOD extend an
 * assessment window's deadline for their own department's subjects.
 */
export class HODAssessmentEntriesService {
  async getAssessmentEntries(userId: string, filters: AssessmentEntriesFilters) {
    const hodDept = await getHODDepartment(userId);
    if (!hodDept) {
      throw new ForbiddenError("Not assigned as HOD of any department");
    }

    const { termId, assessmentType, classId, teacherId, status } = filters;
    const examType = assessmentType as ExamType | undefined;

    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      select: { id: true, year: true },
    });

    if (!academicYear) {
      throw new NotFoundError("No active academic year found");
    }

    let activeTermId = termId;
    if (!activeTermId) {
      const activeTerm = await prisma.term.findFirst({
        where: { academicYearId: academicYear.id, isActive: true },
      });
      activeTermId = activeTerm?.id;
    }

    const departmentSubjects = await prisma.subject.findMany({
      where: { departmentId: hodDept.id },
      select: { id: true, name: true },
    });
    const subjectIds = departmentSubjects.map((s) => s.id);

    const assignments = await prisma.subjectTeacherAssignment.findMany({
      where: {
        subjectId: { in: subjectIds },
        academicYearId: academicYear.id,
        ...(classId && { classId }),
        ...(teacherId && { teacherId }),
      },
      include: {
        teacher: { include: { user: { select: { id: true, email: true } } } },
        subject: true,
        class: {
          include: {
            grade: true,
            enrollments: { where: { status: "ACTIVE" } },
          },
        },
      },
    });

    const assessments = await prisma.assessment.findMany({
      where: {
        subjectId: { in: subjectIds },
        // A teacher's DRAFT is private scratch work — it hasn't been published
        // yet, so it shouldn't show up on the HOD's entry-tracking dashboard
        // and count as something to chase. It appears here only once the
        // teacher explicitly publishes it.
        status: { not: "DRAFT" },
        ...(activeTermId && { termId: activeTermId }),
        ...(examType && { examType }),
      },
      include: {
        subject: true,
        class: { include: { grade: true } },
        results: true,
        term: true,
      },
    });

    const windowKeys = [...new Set(assessments.map((a) => `${a.termId}:${a.examType}`))];
    const windowPairs = windowKeys.map((k) => {
      const [tId, eType] = k.split(":");
      return { termId: tId, examType: eType as ExamType };
    });
    const assessmentWindows = await prisma.assessmentWindow.findMany({
      where: {
        OR: windowPairs.map(({ termId: tId, examType: eType }) => ({
          termId: tId,
          examType: eType,
        })),
      },
    });
    const windowMap = new Map(assessmentWindows.map((w) => [`${w.termId}:${w.examType}`, w]));

    const teacherAssessmentEntries: TeacherAssessmentEntry[] = [];

    for (const assessment of assessments) {
      const assignment = assignments.find(
        (a) => a.subjectId === assessment.subjectId && a.classId === assessment.classId
      );

      if (!assignment) continue;

      const studentCount = assignment.class.enrollments.length;
      const scoresEntered = assessment.results.length;

      const window = windowMap.get(`${assessment.termId}:${assessment.examType}`);
      const deadline = window?.closesAt || assessment.term.endDate || new Date();

      // Note: absent students have no result record (no isAbsent field in schema),
      // so we treat >= studentCount as completed to handle any data edge cases.
      // A teacher who has entered all present students' results will show in-progress
      // until we have proper absent tracking.
      let entryStatus: AssessmentEntryStatus = "not-started";
      const now = new Date();

      if (scoresEntered >= studentCount && studentCount > 0) {
        entryStatus = "completed";
      } else if (scoresEntered > 0) {
        entryStatus = "in-progress";
        if (deadline < now) {
          entryStatus = "overdue";
        }
      } else if (deadline < now) {
        entryStatus = "overdue";
      }

      if (status && status !== "All" && status.toLowerCase() !== entryStatus) {
        continue;
      }

      const lastResult = assessment.results
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .at(0);

      teacherAssessmentEntries.push({
        id: `${assessment.id}-${assignment.teacherId}`,
        teacherId: assignment.teacherId,
        teacherUserId: assignment.teacher.user.id,
        teacherName: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
        teacherEmail: assignment.teacher.user.email,
        subject: assessment.subject.name,
        subjectCode: assessment.subject.code,
        subjectId: assessment.subjectId,
        className: formatCompactClassLabel(assignment.class.grade.name, assignment.class.name),
        classId: assessment.classId,
        totalStudents: studentCount,
        scoresEntered,
        deadline,
        lastUpdated: lastResult?.updatedAt || assessment.updatedAt,
        status: entryStatus,
        assessmentId: assessment.id,
        assessmentType: assessment.examType,
        termId: assessment.termId,
      });
    }

    const stats: AssessmentDashboardStats = {
      completed: teacherAssessmentEntries.filter((a) => a.status === "completed").length,
      inProgress: teacherAssessmentEntries.filter((a) => a.status === "in-progress").length,
      notStarted: teacherAssessmentEntries.filter((a) => a.status === "not-started").length,
      overdue: teacherAssessmentEntries.filter((a) => a.status === "overdue").length,
      totalAssessments: teacherAssessmentEntries.length,
    };

    const terms = await prisma.term.findMany({
      where: { academicYearId: academicYear.id },
      select: { id: true, termType: true },
    });

    const classes = await prisma.class.findMany({
      where: { id: { in: assignments.map((a) => a.classId) } },
      include: { grade: true },
    });

    const teachers = await prisma.teacherProfile.findMany({
      where: { id: { in: assignments.map((a) => a.teacherId) } },
      select: { id: true, firstName: true, lastName: true },
    });

    return {
      assessments: teacherAssessmentEntries,
      stats,
      filters: {
        terms: terms.map((t) => ({
          id: t.id,
          name: `Term ${t.termType.replace("TERM_", "")} · ${academicYear.year ?? ""}`.trim(),
        })),
        assessmentTypes: ["CAT", "MID", "EOT"],
        classes: classes.map((c) => ({ id: c.id, name: formatCompactClassLabel(c.grade.name, c.name) })),
        teachers: teachers.map((t) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` })),
      },
    };
  }

  /**
   * Extend the AssessmentWindow closesAt for a given termId + examType.
   * HOD can only extend windows for assessments within their department.
   */
  async extendDeadline(userId: string, termId: string, examType: string, newDeadline: string) {
    const hodDept = await getHODDepartment(userId);
    if (!hodDept) {
      throw new ForbiddenError("Not assigned as HOD of any department");
    }

    if (!termId || !examType || !newDeadline) {
      throw new ValidationError("termId, examType, and newDeadline are required");
    }

    const deadline = new Date(newDeadline);
    if (isNaN(deadline.getTime())) {
      throw new ValidationError("Invalid newDeadline date");
    }

    const departmentSubjects = await prisma.subject.findMany({
      where: { departmentId: hodDept.id },
      select: { id: true },
    });
    const subjectIds = departmentSubjects.map((s) => s.id);

    const relatedAssessment = await prisma.assessment.findFirst({
      where: {
        termId,
        examType: examType as ExamType,
        subjectId: { in: subjectIds },
      },
      select: { id: true },
    });

    if (!relatedAssessment) {
      throw new ForbiddenError("No assessments in your department match this term and type");
    }

    const window = await prisma.assessmentWindow.upsert({
      where: { termId_examType: { termId, examType: examType as ExamType } },
      update: { closesAt: deadline },
      create: {
        termId,
        examType: examType as ExamType,
        opensAt: new Date(),
        closesAt: deadline,
        createdBy: userId,
      },
    });

    return { termId: window.termId, examType: window.examType, closesAt: window.closesAt };
  }
}

export const hodAssessmentEntriesService = new HODAssessmentEntriesService();
