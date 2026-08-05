import prisma from "@/lib/db/prisma";
import { ExamType } from "@/types/prisma-enums";
import { NotFoundError, ValidationError } from "@/lib/http/errors";
import {
  calculatePercentage,
  percentageToECZPoints,
  percentageToOldSystemGrade,
  calculateBestSixPoints,
  calculateTrend,
  getCurriculumType,
} from "@/lib/services/performance-calculator";

/**
 * Student Performance Service
 *
 * Computes the radar-chart / best-six / class-ranking data shown on a
 * student's performance page. Bespoke reporting logic, not a general CRUD
 * service — kept separate from student.service.ts for that reason.
 */
export const studentPerformanceService = {
  async getStudentPerformance(studentId: string, classId: string, academicYearId: string) {
    if (!classId || !academicYearId) {
      throw new ValidationError("classId and academicYearId are required");
    }

    const activeTerm = await prisma.term.findFirst({
      where: { academicYearId, isActive: true },
    });

    if (!activeTerm) {
      return {
        radarData: { CAT1: [], MID: [], EOT: [] },
        subjectPerformances: [],
        classPosition: null,
        classTotal: null,
        bestSix: null,
      };
    }

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: { grade: { select: { level: true } } },
    });

    if (!classData?.grade) {
      throw new NotFoundError("Class or grade not found");
    }

    const curriculumType = getCurriculumType(classData.grade.level);

    const classSubjects = await prisma.classSubject.findMany({
      where: { classId },
      select: { subjectId: true, isCore: true, subject: { select: { name: true } } },
    });
    const subjectCoreMap = new Map<string, boolean>(
      classSubjects.map((cs) => [cs.subjectId, cs.isCore])
    );

    const assessments = await prisma.assessment.findMany({
      where: { classId, termId: activeTerm.id, status: "COMPLETED" },
      include: {
        subject: { select: { id: true, name: true } },
        results: { where: { studentId }, select: { marksObtained: true } },
      },
    });

    const assessmentsByType: Record<ExamType, typeof assessments> = {
      [ExamType.CAT]: assessments.filter((a) => a.examType === ExamType.CAT),
      [ExamType.MID]: assessments.filter((a) => a.examType === ExamType.MID),
      [ExamType.EOT]: assessments.filter((a) => a.examType === ExamType.EOT),
    };

    const radarData = {
      CAT1: [] as { subject: string; score: number }[],
      MID: [] as { subject: string; score: number }[],
      EOT: [] as { subject: string; score: number }[],
    };

    const subjectPerformanceMap = new Map<
      string,
      {
        subjectName: string;
        assessments: {
          type: "CAT" | "MID" | "EOT";
          score: number;
          rank: number;
          total: number;
          trend: "up" | "down" | "same";
        }[];
      }
    >();

    for (const examType of Object.values(ExamType)) {
      for (const assessment of assessmentsByType[examType]) {
        const result = assessment.results[0];
        if (!result) continue;

        const percentage = calculatePercentage(result.marksObtained, assessment.totalMarks);

        const radarKey = examType === ExamType.CAT ? "CAT1" : examType;
        radarData[radarKey].push({ subject: assessment.subject.name, score: percentage });

        const allResults = await prisma.studentAssessmentResult.findMany({
          where: { assessmentId: assessment.id },
          orderBy: { marksObtained: "desc" },
          select: { studentId: true },
        });

        const rank = allResults.findIndex((r) => r.studentId === studentId) + 1;

        let trend: "up" | "down" | "same" = "same";

        if (examType === ExamType.MID) {
          const prev = assessmentsByType[ExamType.CAT].find(
            (a) => a.subjectId === assessment.subjectId
          );
          if (prev?.results[0]) {
            trend = calculateTrend(
              percentage,
              calculatePercentage(prev.results[0].marksObtained, prev.totalMarks)
            );
          }
        }

        if (examType === ExamType.EOT) {
          const prev = assessmentsByType[ExamType.MID].find(
            (a) => a.subjectId === assessment.subjectId
          );
          if (prev?.results[0]) {
            trend = calculateTrend(
              percentage,
              calculatePercentage(prev.results[0].marksObtained, prev.totalMarks)
            );
          }
        }

        if (!subjectPerformanceMap.has(assessment.subjectId)) {
          subjectPerformanceMap.set(assessment.subjectId, {
            subjectName: assessment.subject.name,
            assessments: [],
          });
        }

        subjectPerformanceMap.get(assessment.subjectId)!.assessments.push({
          type: examType,
          score: percentage,
          rank,
          total: allResults.length,
          trend,
        });
      }
    }

    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: { classId, status: "ACTIVE" },
      select: { studentId: true },
    });

    const averages: { studentId: string; avg: number }[] = [];

    for (const e of enrollments) {
      const results = await prisma.studentAssessmentResult.findMany({
        where: {
          studentId: e.studentId,
          assessment: { classId, termId: activeTerm.id, status: "COMPLETED" },
        },
        include: { assessment: { select: { totalMarks: true } } },
      });

      if (!results.length) continue;

      const avg =
        results.reduce(
          (s, r) => s + calculatePercentage(r.marksObtained, r.assessment.totalMarks),
          0
        ) / results.length;

      averages.push({ studentId: e.studentId, avg });
    }

    averages.sort((a, b) => b.avg - a.avg);
    const classPosition = averages.findIndex((a) => a.studentId === studentId) + 1;

    let bestSixValue: number | null = null;
    let bestSixCount: number | null = null;
    let bestSixType: "percentage" | "points" = "points";
    let bestSixMax: number | null = null;

    for (const examType of [ExamType.EOT, ExamType.MID, ExamType.CAT]) {
      const scores = assessmentsByType[examType]
        .filter((a) => a.results.length)
        .map((a) => {
          const pct = calculatePercentage(a.results[0].marksObtained, a.totalMarks);
          return {
            subject: a.subject.name,
            subjectId: a.subjectId,
            score: a.results[0].marksObtained,
            totalMarks: a.totalMarks,
            isCore: subjectCoreMap.get(a.subjectId) ?? false,
            percentage: pct,
            points:
              curriculumType === "NEW_SYSTEM"
                ? percentageToECZPoints(pct)
                : percentageToOldSystemGrade(pct),
          };
        });

      if (scores.length) {
        const result = calculateBestSixPoints(scores, curriculumType);
        if (result) {
          bestSixValue = result.value;
          bestSixCount = result.count;
          bestSixType = result.type as "percentage" | "points";
          bestSixMax = result.maxValue;
        }
        break;
      }
    }

    return {
      radarData,
      subjectPerformances: Array.from(subjectPerformanceMap.values()),
      classPosition: classPosition || null,
      classTotal: averages.length || null,
      bestSix: bestSixValue,
      bestSixCount,
      bestSixType,
      bestSixMax,
      curriculumType,
    };
  },
};
