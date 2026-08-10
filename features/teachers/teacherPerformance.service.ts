import prisma from "@/lib/db/prisma";
import { ExamType } from "@/types/prisma-enums";
import { ForbiddenError, NotFoundError, BadRequestError } from "@/lib/http/errors";
import {
  getStudentSubjectScores,
  getStudentSubjectScoresWithCore,
  getStudentClassRankings,
  calculateClassPosition,
  calculateBestSixPoints,
  calculateOverallTrend,
  calculatePercentage,
  calculateTrend,
  type CurriculumType,
} from "@/lib/services/performance-calculator";
import { resolveECZLevel } from "@/lib/grading/ecz-grading-system";

interface StudentSubjectPerformance {
  studentId: string;
  studentName: string;
  assessments: Array<{
    type: ExamType;
    score: number;
    rank: number;
    total: number;
    trend: "up" | "down" | "same";
    isAbsent?: boolean;
  }>;
}

/**
 * Teacher Performance Service
 *
 * Bespoke reporting for the teacher-facing performance views: a single
 * student's cross-subject radar/best-six, and a whole class/subject's
 * per-student breakdown. Both are scoped to what the requesting teacher is
 * actually assigned to teach.
 */
export const teacherPerformanceService = {
  /**
   * Verify teacher has access to student's data: class teacher of the
   * student's class, or subject teacher for any of student's subjects.
   */
  async verifyTeacherStudentAccess(teacherId: string, studentId: string): Promise<boolean> {
    const enrollment = await prisma.studentClassEnrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      select: { classId: true },
    });
    if (!enrollment) return false;

    const isClassTeacher = await prisma.classTeacherAssignment.findFirst({
      where: { teacherId, classId: enrollment.classId },
    });
    if (isClassTeacher) return true;

    const isSubjectTeacher = await prisma.subjectTeacherAssignment.findFirst({
      where: { teacherId, classId: enrollment.classId },
    });
    return !!isSubjectTeacher;
  },

  async getTeacherSubjectNames(teacherId: string): Promise<string[]> {
    const assignments = await prisma.subjectTeacherAssignment.findMany({
      where: { teacherId },
      include: { subject: { select: { name: true } } },
      distinct: ["subjectId"],
    });
    return assignments.map((a) => a.subject.name);
  },

  /**
   * One student's radar/best-six/class-position performance, as seen by a
   * teacher who has access to them.
   */
  async getStudentPerformanceForTeacher(
    userId: string,
    studentId: string,
    assessmentType: ExamType,
    termId: string
  ) {
    if (!["CAT", "MID", "EOT"].includes(assessmentType)) {
      throw new BadRequestError("Invalid assessment type. Must be CAT, MID, or EOT");
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!teacherProfile) {
      throw new NotFoundError("Teacher profile not found");
    }

    const hasAccess = await this.verifyTeacherStudentAccess(teacherProfile.id, studentId);
    if (!hasAccess) {
      throw new ForbiddenError("You do not have access to this student's data");
    }

    const teacherSubjects = await this.getTeacherSubjectNames(teacherProfile.id);

    const enrollment = await prisma.studentClassEnrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      select: {
        class: { select: { name: true, grade: { select: { level: true, name: true } } } },
      },
    });

    // Resolve ECZ grading level honouring Form class naming (e.g. "F1 A" -> SENIOR)
    const eczLevel = enrollment?.class
      ? resolveECZLevel(
          enrollment.class.grade.level as Parameters<typeof resolveECZLevel>[0],
          enrollment.class.grade.name,
          enrollment.class.name
        )
      : "SENIOR";

    const curriculumType: CurriculumType =
      eczLevel === "JUNIOR" ? "STANDARD" : eczLevel === "PRIMARY" ? "OLD_SYSTEM" : "NEW_SYSTEM";

    const subjectScores = await getStudentSubjectScores(studentId, assessmentType, termId);
    const subjectScoresWithCore = await getStudentSubjectScoresWithCore(
      studentId,
      assessmentType,
      termId
    );

    const bestSixTypeFallback =
      curriculumType === "STANDARD"
        ? "standard_points"
        : curriculumType === "OLD_SYSTEM"
        ? "percentage"
        : "points";

    // Valid empty state: no assessment results yet (term start, or none created)
    if (subjectScores.length === 0) {
      return {
        studentId,
        assessmentType,
        termId,
        radarChartData: [],
        classRankings: [],
        classPosition: null,
        classTotal: 0,
        bestSix: null,
        bestSixCount: null,
        bestSixType: bestSixTypeFallback,
        trend: "same" as const,
        trendIsAbsolute: false,
      };
    }

    const radarChartData = subjectScores.map((score) => ({
      subject: score.subject,
      score: calculatePercentage(score.score, score.totalMarks),
    }));

    const classRankings = await getStudentClassRankings(
      studentId,
      assessmentType,
      termId,
      teacherSubjects
    );
    const classPositionData = await calculateClassPosition(studentId, assessmentType, termId);
    const bestSixResult = calculateBestSixPoints(subjectScoresWithCore, curriculumType);
    const { trend, isAbsolute: trendIsAbsolute } = await calculateOverallTrend(
      studentId,
      assessmentType,
      termId
    );

    return {
      studentId,
      assessmentType,
      termId,
      radarChartData,
      classRankings,
      classPosition: classPositionData.position,
      classTotal: classPositionData.total,
      bestSix: bestSixResult?.value ?? null,
      bestSixCount: bestSixResult?.count ?? null,
      bestSixType: bestSixResult?.type ?? bestSixTypeFallback,
      trend,
      trendIsAbsolute,
    };
  },

  /**
   * Per-student performance breakdown for a subject (and optionally one
   * class), scoped to a teacher who actually teaches that subject.
   */
  async getSubjectPerformance(
    userId: string,
    subjectId: string,
    termId: string,
    classId: string | null
  ) {
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

    const teachesSubject = await prisma.subjectTeacherAssignment.findFirst({
      where: {
        teacherId: teacherProfile.id,
        subjectId,
        academicYearId: academicYear.id,
        ...(classId && { classId }),
      },
    });
    if (!teachesSubject) {
      throw new ForbiddenError("You do not have access to this subject");
    }

    let studentIds: string[];
    if (classId) {
      const enrollments = await prisma.studentClassEnrollment.findMany({
        where: { classId, status: "ACTIVE" },
        select: { studentId: true },
      });
      studentIds = enrollments.map((e) => e.studentId);
    } else {
      const assignments = await prisma.subjectTeacherAssignment.findMany({
        where: { teacherId: teacherProfile.id, subjectId },
        select: { classId: true },
      });
      const classIds = assignments.map((a) => a.classId);
      const enrollments = await prisma.studentClassEnrollment.findMany({
        where: { classId: { in: classIds }, status: "ACTIVE" },
        select: { studentId: true },
      });
      studentIds = enrollments.map((e) => e.studentId);
    }

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, firstName: true, middleName: true, lastName: true },
    });

    const assessments = await prisma.assessment.findMany({
      where: { subjectId, termId, ...(classId && { classId }) },
      select: { id: true, examType: true, totalMarks: true, classId: true },
      orderBy: { examType: "asc" },
    });

    const performanceData: StudentSubjectPerformance[] = [];

    for (const student of students) {
      const studentName = `${student.firstName} ${student.middleName || ""} ${student.lastName}`.trim();
      const studentAssessments: StudentSubjectPerformance["assessments"] = [];
      let previousScore: number | null = null;

      for (const assessment of assessments) {
        const result = await prisma.studentAssessmentResult.findFirst({
          where: { studentId: student.id, assessmentId: assessment.id },
          select: { marksObtained: true, isAbsent: true },
        });
        if (!result) continue;

        // Rank/total are computed over students who actually sat the
        // assessment — an AB entry (marksObtained=0, isAbsent=true) must not
        // be counted as a real score or drag down other students' ranking.
        const allResults = await prisma.studentAssessmentResult.findMany({
          where: { assessmentId: assessment.id, isAbsent: false },
          select: { studentId: true, marksObtained: true },
          orderBy: { marksObtained: "desc" },
        });
        const total = allResults.length;

        if (result.isAbsent) {
          studentAssessments.push({
            type: assessment.examType,
            score: 0,
            rank: 0,
            total,
            trend: "same",
            isAbsent: true,
          });
          continue;
        }

        const scorePercentage = calculatePercentage(result.marksObtained, assessment.totalMarks);
        const rank = allResults.findIndex((r) => r.studentId === student.id) + 1;
        const trend = calculateTrend(scorePercentage, previousScore);
        previousScore = scorePercentage;

        studentAssessments.push({ type: assessment.examType, score: scorePercentage, rank, total, trend });
      }

      if (studentAssessments.length > 0) {
        performanceData.push({ studentId: student.id, studentName, assessments: studentAssessments });
      }
    }

    performanceData.sort((a, b) => {
      const aLatest = a.assessments[a.assessments.length - 1]?.score || 0;
      const bLatest = b.assessments[b.assessments.length - 1]?.score || 0;
      return bLatest - aLatest;
    });

    return { subjectId, termId, classId: classId || null, students: performanceData };
  },
};
