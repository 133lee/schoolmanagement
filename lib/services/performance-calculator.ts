import prisma from "@/lib/db/prisma";
import { ExamType } from "@/types/prisma-enums";

// Re-export all pure (client-safe) functions and types from the pure module
export type {
  CurriculumType,
  BestSixResult,
  SubjectWithCore,
  StudentScore,
} from "./performance-calculator-pure";
export {
  getCurriculumType,
  calculatePercentage,
  percentageToOldSystemGrade,
  percentageToECZPoints,
  calculateBestSixPoints,
  calculateBestSix,
  calculateTrend,
  absoluteStatusTrend,
  computeBestOfSixFromReportCard,
} from "./performance-calculator-pure";

import {
  SubjectWithCore,
  StudentScore,
  calculatePercentage,
  percentageToECZPoints,
  calculateTrend,
  absoluteStatusTrend,
} from "./performance-calculator-pure";

interface ClassRanking {
  subject: string;
  subjectCode: string;
  score: number;
  rank: number;
  total: number;
  trend: "up" | "down" | "same";
  isTeacherSubject: boolean;
}

/**
 * Get student's subject scores for a specific assessment type and term
 */
export async function getStudentSubjectScores(
  studentId: string,
  examType: ExamType,
  termId: string
): Promise<StudentScore[]> {
  const results = await prisma.studentAssessmentResult.findMany({
    where: {
      studentId,
      assessment: {
        examType,
        termId,
      },
    },
    include: {
      assessment: {
        select: {
          totalMarks: true,
          subject: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return results.map((result) => ({
    subject: result.assessment.subject.name,
    score: result.marksObtained,
    totalMarks: result.assessment.totalMarks,
    grade: result.grade || null,
  }));
}

/**
 * Get student's subject scores with core/elective status
 * Required for ECZ Best Six calculation
 */
export async function getStudentSubjectScoresWithCore(
  studentId: string,
  examType: ExamType,
  termId: string
): Promise<SubjectWithCore[]> {
  // Get student's current class to determine grade
  const enrollment = await prisma.studentClassEnrollment.findFirst({
    where: {
      studentId,
      status: "ACTIVE",
    },
    select: {
      class: {
        select: {
          gradeId: true,
        },
      },
    },
  });

  if (!enrollment) return [];

  const results = await prisma.studentAssessmentResult.findMany({
    where: {
      studentId,
      assessment: {
        examType,
        termId,
      },
    },
    include: {
      assessment: {
        select: {
          totalMarks: true,
          subjectId: true,
          subject: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  // Fetch GradeSubject data to get isCore status
  const gradeSubjects = await prisma.gradeSubject.findMany({
    where: {
      gradeId: enrollment.class.gradeId,
      subjectId: {
        in: results.map((r) => r.assessment.subjectId),
      },
    },
    select: {
      subjectId: true,
      isCore: true,
    },
  });

  const coreMap = new Map(
    gradeSubjects.map((gs) => [gs.subjectId, gs.isCore])
  );

  return results.map((result) => {
    const percentage = calculatePercentage(
      result.marksObtained,
      result.assessment.totalMarks
    );
    const points = percentageToECZPoints(percentage);

    return {
      subject: result.assessment.subject.name,
      subjectId: result.assessment.subjectId,
      score: result.marksObtained,
      totalMarks: result.assessment.totalMarks,
      isCore: coreMap.get(result.assessment.subjectId) ?? false,
      percentage,
      points,
    };
  });
}

/**
 * Calculate student's ranking in a subject within their class
 */
export async function calculateSubjectRanking(
  studentId: string,
  subjectId: string,
  assessmentId: string
): Promise<{ rank: number; total: number }> {
  // Get the student's class enrollment
  const enrollment = await prisma.studentClassEnrollment.findFirst({
    where: {
      studentId,
      status: "ACTIVE",
    },
    select: {
      classId: true,
    },
  });

  if (!enrollment) {
    return { rank: 0, total: 0 };
  }

  // Get all students in the same class
  const classStudents = await prisma.studentClassEnrollment.findMany({
    where: {
      classId: enrollment.classId,
      status: "ACTIVE",
    },
    select: {
      studentId: true,
    },
  });

  const studentIds = classStudents.map((s) => s.studentId);

  // Get all results for this assessment
  const results = await prisma.studentAssessmentResult.findMany({
    where: {
      assessmentId,
      studentId: {
        in: studentIds,
      },
    },
    select: {
      studentId: true,
      marksObtained: true,
    },
    orderBy: {
      marksObtained: "desc",
    },
  });

  const total = results.length;
  const rank = results.findIndex((r) => r.studentId === studentId) + 1;

  return { rank: rank || 0, total };
}

/**
 * Get student's class rankings across all subjects
 */
export async function getStudentClassRankings(
  studentId: string,
  examType: ExamType,
  termId: string,
  teacherSubjects: string[]
): Promise<ClassRanking[]> {
  // Get student's current class
  const enrollment = await prisma.studentClassEnrollment.findFirst({
    where: {
      studentId,
      status: "ACTIVE",
    },
    select: {
      classId: true,
    },
  });

  if (!enrollment) return [];

  // Get all assessments for this exam type and term in student's class
  const assessments = await prisma.assessment.findMany({
    where: {
      classId: enrollment.classId,
      examType,
      termId,
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      results: {
        where: {
          studentId,
        },
        select: {
          marksObtained: true,
        },
      },
    },
  });

  // Get previous exam type for trend calculation
  const previousExamType = getPreviousExamType(examType);
  const previousResults = previousExamType
    ? await prisma.studentAssessmentResult.findMany({
        where: {
          studentId,
          assessment: {
            classId: enrollment.classId,
            examType: previousExamType,
            termId,
          },
        },
        select: {
          subjectId: true,
          marksObtained: true,
          assessment: {
            select: {
              totalMarks: true,
            },
          },
        },
      })
    : [];

  const previousScoresMap = new Map(
    previousResults.map((r) => [
      r.subjectId,
      calculatePercentage(r.marksObtained, r.assessment.totalMarks),
    ])
  );

  // Calculate rankings for each subject
  const rankings: ClassRanking[] = [];

  for (const assessment of assessments) {
    if (assessment.results.length === 0) continue;

    const result = assessment.results[0];
    const currentPercentage = calculatePercentage(
      result.marksObtained,
      assessment.totalMarks
    );

    const rankingInfo = await calculateSubjectRanking(
      studentId,
      assessment.subjectId,
      assessment.id
    );

    const previousScore = previousScoresMap.get(assessment.subjectId) ?? null;
    const trend = previousExamType === null
      ? absoluteStatusTrend(currentPercentage)
      : calculateTrend(currentPercentage, previousScore);

    rankings.push({
      subject: assessment.subject.name,
      subjectCode: assessment.subject.code,
      score: currentPercentage,
      rank: rankingInfo.rank,
      total: rankingInfo.total,
      trend,
      isTeacherSubject: teacherSubjects.includes(assessment.subject.name),
    });
  }

  // Sort by rank (ascending)
  return rankings.sort((a, b) => a.rank - b.rank);
}

/**
 * Get previous exam type for trend calculation
 */
function getPreviousExamType(examType: ExamType): ExamType | null {
  switch (examType) {
    case "MID":
      return "CAT";
    case "EOT":
      return "MID";
    default:
      return null;
  }
}

/**
 * Calculate overall class position for a student
 */
export async function calculateClassPosition(
  studentId: string,
  examType: ExamType,
  termId: string
): Promise<{ position: number; total: number }> {
  // Get student's current class
  const enrollment = await prisma.studentClassEnrollment.findFirst({
    where: {
      studentId,
      status: "ACTIVE",
    },
    select: {
      classId: true,
    },
  });

  if (!enrollment) {
    return { position: 0, total: 0 };
  }

  // Get all students in the class
  const classStudents = await prisma.studentClassEnrollment.findMany({
    where: {
      classId: enrollment.classId,
      status: "ACTIVE",
    },
    select: {
      studentId: true,
    },
  });

  const studentIds = classStudents.map((s) => s.studentId);

  // Calculate average score for each student
  const studentAverages: { studentId: string; average: number }[] = [];

  for (const student of classStudents) {
    const scores = await getStudentSubjectScores(
      student.studentId,
      examType,
      termId
    );

    if (scores.length > 0) {
      const percentages = scores.map((s) =>
        calculatePercentage(s.score, s.totalMarks)
      );
      const average =
        percentages.reduce((sum, p) => sum + p, 0) / percentages.length;

      studentAverages.push({
        studentId: student.studentId,
        average,
      });
    }
  }

  // Sort by average (descending)
  studentAverages.sort((a, b) => b.average - a.average);

  const position =
    studentAverages.findIndex((s) => s.studentId === studentId) + 1;

  return {
    position: position || 0,
    total: studentAverages.length,
  };
}

/**
 * Calculate overall performance trend
 */
export async function calculateOverallTrend(
  studentId: string,
  examType: ExamType,
  termId: string
): Promise<{ trend: "up" | "down" | "same"; isAbsolute: boolean }> {
  const currentScores = await getStudentSubjectScores(
    studentId,
    examType,
    termId
  );

  if (currentScores.length === 0) return { trend: "same", isAbsolute: false };

  const currentAverage =
    currentScores.reduce(
      (sum, s) => sum + calculatePercentage(s.score, s.totalMarks),
      0
    ) / currentScores.length;

  const previousExamType = getPreviousExamType(examType);
  if (!previousExamType) {
    return { trend: absoluteStatusTrend(currentAverage), isAbsolute: true };
  }

  const previousScores = await getStudentSubjectScores(
    studentId,
    previousExamType,
    termId
  );

  if (previousScores.length === 0) return { trend: "same", isAbsolute: false };

  const previousAverage =
    previousScores.reduce(
      (sum, s) => sum + calculatePercentage(s.score, s.totalMarks),
      0
    ) / previousScores.length;

  return { trend: calculateTrend(currentAverage, previousAverage), isAbsolute: false };
}
