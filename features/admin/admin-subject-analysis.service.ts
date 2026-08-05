import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger/logger";
import { NotFoundError, BadRequestError } from "@/lib/http/errors";
import {
  getGradeDistributionStructure,
  getDistinctionGrades,
  resolveECZLevel,
  type GradeLevel,
} from "@/lib/grading/ecz-grading-system";
import { academicPolicyService } from "@/features/settings/academicPolicy.service";

/**
 * Admin Subject Analysis Service
 *
 * Business logic for admin viewing grade-level subject analytics across all streams.
 * Aggregates data from multiple classes (e.g., Grade 8A + 8B + 8C combined).
 */
export class AdminSubjectAnalysisService {
  /**
   * Get grade-level subject analysis (all streams combined)
   *
   * @param gradeId - The grade ID (e.g., "Grade 8")
   * @param subjectId - The subject ID
   * @param termId - The term ID
   * @param assessmentType - Assessment type (CAT, MID, EOT)
   * @returns Aggregated grade distribution and analysis data across all classes
   */
  async getGradeLevelSubjectAnalysis(
    gradeId: string,
    subjectId: string,
    termId: string,
    assessmentType: string,
    convention?: "standard" | "form"
  ): Promise<{
    gradeLevel: GradeLevel;
    gradeName: string;
    subjectName: string;
    totalClasses: number;
    totalStudents: { male: number; female: number; total: number };
    recordedEntries: { male: number; female: number; total: number };
    absentStudents: { male: number; female: number; total: number };
    gradeDistribution: Array<{
      grade: string;
      range: string;
      gradeEnum: string;
      male: number;
      female: number;
      total: number;
      percentage: number;
    }>;
    quantityPass: { passed: number; total: number; rate: number };
    qualityPass: { qualityPasses: number; totalPassed: number; rate: number };
  }> {
    logger.info("Fetching grade-level subject analysis", {
      gradeId,
      subjectId,
      termId,
      assessmentType,
    });

    if (!gradeId || !subjectId || !termId) {
      throw new BadRequestError(
        "Grade ID, Subject ID, and Term ID are required"
      );
    }

    // Map assessment type (CAT → CAT, MID → MID, EOT → EOT)
    let examType = "CAT";
    if (assessmentType === "CAT" || assessmentType === "CAT1") examType = "CAT";
    else if (assessmentType === "MID") examType = "MID";
    else if (assessmentType === "EOT") examType = "EOT";

    // Get grade information
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      select: {
        id: true,
        level: true,
        name: true,
      },
    });

    if (!grade) {
      throw new NotFoundError("Grade not found");
    }

    // Get subject information
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    if (!subject) {
      throw new NotFoundError("Subject not found");
    }

    // Get term information
    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: {
        id: true,
        termType: true,
        academicYearId: true,
      },
    });

    if (!term) {
      throw new NotFoundError("Term not found");
    }

    // STEP 1: Get ALL active classes for this grade
    const allClasses = await prisma.class.findMany({
      where: {
        gradeId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
      },
    });

    const isFormName = (name: string) =>
      /\bForm\s*[1-9]\b|^F[1-9][\s\-]/i.test(name);

    // When the admin has explicitly chosen a convention for Grade 8/9, use it
    // to both filter classes and authoritatively set the grading scale.
    // For Grade 10-12 (always Senior) convention is not passed.
    let classes = allClasses;
    let gradeLevel: GradeLevel;

    if (convention === "standard") {
      classes = allClasses.filter((c) => !isFormName(c.name));
      gradeLevel = "JUNIOR";
    } else if (convention === "form") {
      classes = allClasses.filter((c) => isFormName(c.name));
      gradeLevel = "SENIOR";
    } else {
      // No convention selected — fall back to name-based detection
      const formClass = allClasses.find((c) => isFormName(c.name));
      gradeLevel = resolveECZLevel(grade.level, grade.name, formClass?.name);
    }

    const classIds = classes.map((c) => c.id);

    logger.debug("Grade level determined", {
      gradeId,
      gradeName: grade.name,
      convention,
      gradeLevel,
    });

    logger.debug("Classes found for grade", {
      gradeId,
      totalClasses: classes.length,
      classIds,
    });

    if (classes.length === 0) {
      // No classes for this grade - return empty data
      const emptyGradeDistribution = getGradeDistributionStructure(gradeLevel);

      return {
        gradeLevel,
        gradeName: grade.name,
        subjectName: subject.name,
        totalClasses: 0,
        totalStudents: { male: 0, female: 0, total: 0 },
        recordedEntries: { male: 0, female: 0, total: 0 },
        absentStudents: { male: 0, female: 0, total: 0 },
        gradeDistribution: emptyGradeDistribution,
        quantityPass: { passed: 0, total: 0, rate: 0 },
        qualityPass: { qualityPasses: 0, totalPassed: 0, rate: 0 },
      };
    }

    // STEP 2: Get ALL enrolled students across ALL classes
    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: {
        classId: {
          in: classIds,
        },
        academicYearId: term.academicYearId,
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
            gender: true,
          },
        },
      },
    });

    const students = enrollments.map((e) => e.student);

    // Count total students by gender
    const totalMale = students.filter((s) => s.gender === "MALE").length;
    const totalFemale = students.filter((s) => s.gender === "FEMALE").length;
    const totalStudents = students.length;

    logger.debug("Total students across all classes", {
      totalStudents,
      totalMale,
      totalFemale,
    });

    // STEP 3: Get ALL assessments for this subject across ALL classes
    const assessments = await prisma.assessment.findMany({
      where: {
        subjectId,
        classId: {
          in: classIds,
        },
        termId,
        examType: examType as any,
        status: {
          in: ["PUBLISHED", "COMPLETED"],
        },
      },
      select: {
        id: true,
        classId: true,
      },
    });

    const assessmentIds = assessments.map((a) => a.id);

    logger.debug("Assessments found", {
      totalAssessments: assessments.length,
      assessmentIds,
    });

    // STEP 4: Get ALL assessment results across ALL assessments
    let results: any[] = [];
    let recordedMale = 0;
    let recordedFemale = 0;

    // Create a map of assessmentId -> totalMarks for percentage calculation
    const assessmentTotalMarks = new Map<string, number>();
    if (assessmentIds.length > 0) {
      const assessmentDetails = await prisma.assessment.findMany({
        where: {
          id: { in: assessmentIds },
        },
        select: {
          id: true,
          totalMarks: true,
        },
      });
      assessmentDetails.forEach((a) => {
        assessmentTotalMarks.set(a.id, a.totalMarks);
      });

      results = await prisma.studentAssessmentResult.findMany({
        where: {
          assessmentId: {
            in: assessmentIds,
          },
          studentId: {
            in: students.map((s) => s.id),
          },
        },
        include: {
          student: {
            select: {
              gender: true,
            },
          },
        },
      });

      // Count recorded entries (students who actually sat for exam)
      results.forEach((result) => {
        if (result.marksObtained !== null) {
          if (result.student.gender === "MALE") recordedMale++;
          else recordedFemale++;
        }
      });
    }

    const totalRecorded = recordedMale + recordedFemale;
    const absentMale = totalMale - recordedMale;
    const absentFemale = totalFemale - recordedFemale;
    const totalAbsent = totalStudents - totalRecorded;

    logger.debug("Assessment results aggregated", {
      totalResults: results.length,
      recordedMale,
      recordedFemale,
      totalRecorded,
      absentMale,
      absentFemale,
      totalAbsent,
    });

    // STEP 5: Get grade distribution structure from central grading system
    const gradeDistribution = getGradeDistributionStructure(gradeLevel);

    // STEP 6: Categorize results by grade (AGGREGATE across all classes)
    results.forEach((result) => {
      if (result.grade && result.marksObtained !== null) {
        const gradeEntry = gradeDistribution.find(
          (g) => g.gradeEnum === result.grade
        );
        if (gradeEntry) {
          gradeEntry.total++;
          if (result.student.gender === "MALE") {
            gradeEntry.male++;
          } else {
            gradeEntry.female++;
          }
        }
      }
    });

    // Calculate percentages
    gradeDistribution.forEach((grade) => {
      if (totalRecorded > 0) {
        grade.percentage = parseFloat(
          ((grade.total / totalRecorded) * 100).toFixed(1)
        );
      }
    });

    // STEP 7: Calculate pass rates against the school's configured subject
    // pass mark (admin/settings/academic-policy), not a hardcoded value.
    const passMark = await academicPolicyService.getSubjectPassMark(gradeLevel);
    const passedResults = results.filter((r) => {
      if (r.marksObtained === null) return false;
      const totalMarks = assessmentTotalMarks.get(r.assessmentId) || 100;
      const percentage = (r.marksObtained / totalMarks) * 100;
      return percentage >= passMark;
    });
    const passed = passedResults.length;
    const quantityPassRate =
      totalRecorded > 0 ? (passed / totalRecorded) * 100 : 0;

    // Quality pass (Distinction grades based on grade level)
    const distinctionGrades = getDistinctionGrades(gradeLevel);
    const qualityPasses = results.filter(
      (r) =>
        r.marksObtained !== null &&
        r.grade &&
        distinctionGrades.includes(r.grade)
    ).length;
    const qualityPassRate = passed > 0 ? (qualityPasses / passed) * 100 : 0;

    logger.info("Grade-level subject analysis computed successfully", {
      gradeId,
      subjectId,
      termId,
      assessmentType,
      totalClasses: classes.length,
      totalStudents,
      recordedEntries: totalRecorded,
      passRate: quantityPassRate.toFixed(1),
      qualityPassRate: qualityPassRate.toFixed(1),
    });

    return {
      gradeLevel,
      gradeName: grade.name,
      subjectName: subject.name,
      totalClasses: classes.length,
      totalStudents: {
        male: totalMale,
        female: totalFemale,
        total: totalStudents,
      },
      recordedEntries: {
        male: recordedMale,
        female: recordedFemale,
        total: totalRecorded,
      },
      absentStudents: {
        male: absentMale,
        female: absentFemale,
        total: totalAbsent,
      },
      gradeDistribution,
      quantityPass: {
        passed,
        total: totalRecorded,
        rate: parseFloat(quantityPassRate.toFixed(1)),
      },
      qualityPass: {
        qualityPasses,
        totalPassed: passed,
        rate: parseFloat(qualityPassRate.toFixed(1)),
      },
    };
  }

  /**
   * Get grade-level subject analysis WITH stream-by-stream breakdown
   *
   * @param gradeId - The grade ID
   * @param subjectId - The subject ID
   * @param termId - The term ID
   * @param assessmentType - Assessment type (CAT, MID, EOT)
   * @returns Overall analysis PLUS per-class breakdown
   */
  async getGradeLevelSubjectAnalysisWithStreams(
    gradeId: string,
    subjectId: string,
    termId: string,
    assessmentType: string,
    convention?: "standard" | "form"
  ) {
    // Get overall analysis
    const overall = await this.getGradeLevelSubjectAnalysis(
      gradeId,
      subjectId,
      termId,
      assessmentType,
      convention
    );

    // Map assessment type
    let examType = "CAT";
    if (assessmentType === "CAT" || assessmentType === "CAT1") examType = "CAT";
    else if (assessmentType === "MID") examType = "MID";
    else if (assessmentType === "EOT") examType = "EOT";

    const passMark = await academicPolicyService.getSubjectPassMark(overall.gradeLevel);

    // Get term for academic year
    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: { academicYearId: true },
    });

    if (!term) {
      throw new NotFoundError("Term not found");
    }

    // Get all classes for this grade, filtered by convention if provided
    const isFormName = (name: string) =>
      /\bForm\s*[1-9]\b|^F[1-9][\s\-]/i.test(name);

    const allStreamClasses = await prisma.class.findMany({
      where: {
        gradeId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const classes =
      convention === "standard"
        ? allStreamClasses.filter((c) => !isFormName(c.name))
        : convention === "form"
        ? allStreamClasses.filter((c) => isFormName(c.name))
        : allStreamClasses;

    // For each class, get its stats
    const streamBreakdown = await Promise.all(
      classes.map(async (classItem) => {
        // Get enrolled students for this class
        const enrollments = await prisma.studentClassEnrollment.findMany({
          where: {
            classId: classItem.id,
            academicYearId: term.academicYearId,
            status: "ACTIVE",
          },
          include: {
            student: {
              select: {
                id: true,
                gender: true,
              },
            },
          },
        });

        const totalEnrolled = enrollments.length;
        const students = enrollments.map((e) => e.student);

        // Get assessment for this class
        const assessment = await prisma.assessment.findFirst({
          where: {
            subjectId,
            classId: classItem.id,
            termId,
            examType: examType as any,
            status: {
              in: ["PUBLISHED", "COMPLETED"],
            },
          },
        });

        if (!assessment) {
          return {
            className: classItem.name,
            enrolled: totalEnrolled,
            sat: 0,
            absent: totalEnrolled,
            passRate: 0,
            qualityRate: 0,
          };
        }

        // Get results for this assessment
        const results = await prisma.studentAssessmentResult.findMany({
          where: {
            assessmentId: assessment.id,
            studentId: {
              in: students.map((s) => s.id),
            },
          },
        });

        const sat = results.filter((r) => r.marksObtained !== null).length;
        const absent = totalEnrolled - sat;

        // Calculate pass rate against the school's configured subject pass mark.
        const passed = results.filter((r) => {
          if (r.marksObtained === null) return false;
          const percentage = (r.marksObtained / assessment.totalMarks) * 100;
          return percentage >= passMark;
        }).length;
        const passRate = sat > 0 ? parseFloat(((passed / sat) * 100).toFixed(1)) : 0;

        const distinctionGrades = getDistinctionGrades(overall.gradeLevel);
        const qualityPasses = results.filter(
          (r) =>
            r.marksObtained !== null &&
            r.grade &&
            distinctionGrades.includes(r.grade)
        ).length;
        const qualityRate =
          passed > 0 ? parseFloat(((qualityPasses / passed) * 100).toFixed(1)) : 0;

        return {
          className: classItem.name,
          enrolled: totalEnrolled,
          sat,
          absent,
          passRate,
          qualityRate,
        };
      })
    );

    return {
      overall,
      streamBreakdown,
    };
  }
}

// Export singleton instance
export const adminSubjectAnalysisService = new AdminSubjectAnalysisService();
