import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger/logger";
import { NotFoundError, BadRequestError } from "@/lib/http/errors";
import { teacherStudentService } from "./teacher-student.service";
import { reportService } from "@/features/reports/report.service";
import {
  getGradeDistributionStructure,
  getPassingGrades,
  getDistinctionGrades,
  resolveECZLevel,
  type GradeLevel,
} from "@/lib/grading/ecz-grading-system";
import { academicPolicyService } from "@/features/settings/academicPolicy.service";

type AssessmentAnalysis = {
  gradeLevel: GradeLevel;
  totalStudents: { male: number; female: number; total: number };
  recordedEntries: { male: number; female: number; total: number };
  absentStudents: { male: number; female: number; total: number };
  gradeDistribution: Array<{
    gradeEnum: string;
    gradeLabel: string;
    minMark: number;
    maxMark: number;
    male: number;
    female: number;
    total: number;
    percentage: number;
  }>;
  quantityPass: { passed: number; total: number; rate: number };
  qualityPass: { qualityPasses: number; totalPassed: number; rate: number };
};

/**
 * Teacher Gradebook Service
 *
 * Business logic for teachers viewing grade analytics and assessment data.
 * Handles grade distributions, pass rates, and quality metrics.
 */
export class TeacherGradebookService {
  /**
   * Get assessment analysis for a class and subject (teacher-facing).
   *
   * @param userId - The user ID of the requesting teacher (access-checked
   *   against classId — this method has no other authorization boundary)
   * @param subjectId - The subject ID
   * @param classId - The class ID
   * @param assessmentType - Assessment type (CAT1, MID, EOT)
   * @param termId - Optional term ID (uses active term if not provided)
   * @returns Grade distribution and analysis data
   */
  async getAssessmentAnalysis(
    userId: string,
    subjectId: string,
    classId: string,
    assessmentType: string,
    termId?: string
  ): Promise<AssessmentAnalysis> {
    if (!subjectId || !classId) {
      throw new BadRequestError("Subject ID and Class ID are required");
    }

    // Verify the requesting teacher actually teaches this class (as class
    // teacher or subject teacher) — matches the check every sibling method
    // in this feature (getStudentsForClass, getClassAttendanceForMonth,
    // getAttendanceTrends) already applies; this one was missing it.
    await teacherStudentService.verifyTeacherClassAccess(userId, classId);

    return this.computeAssessmentAnalysis(subjectId, classId, assessmentType, termId);
  }

  /**
   * Get assessment analysis for a class and subject (HOD-facing).
   *
   * Same computation as {@link getAssessmentAnalysis}, but the access boundary
   * is "does this class have a subject from the HOD's department" rather than
   * "does this teacher personally teach this class" — an HOD reviewing another
   * teacher's class is the whole point of HOD reporting, so the teacher-only
   * check would incorrectly reject them.
   */
  async getAssessmentAnalysisForHOD(
    userId: string,
    subjectId: string,
    classId: string,
    assessmentType: string,
    termId?: string
  ): Promise<AssessmentAnalysis> {
    if (!subjectId || !classId) {
      throw new BadRequestError("Subject ID and Class ID are required");
    }

    await reportService.verifyHODClassAccess(userId, classId);

    return this.computeAssessmentAnalysis(subjectId, classId, assessmentType, termId);
  }

  private async computeAssessmentAnalysis(
    subjectId: string,
    classId: string,
    assessmentType: string,
    termId?: string
  ): Promise<AssessmentAnalysis> {
    logger.info("Fetching assessment analysis", {
      subjectId,
      classId,
      assessmentType,
      termId,
    });

    // Get active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!academicYear) {
      throw new NotFoundError("No active academic year found");
    }

    // Use provided termId or get active term
    let term;
    if (termId) {
      term = await prisma.term.findUnique({
        where: { id: termId },
      });
      if (!term) {
        throw new NotFoundError("Term not found");
      }
    } else {
      term = await prisma.term.findFirst({
        where: {
          academicYearId: academicYear.id,
          isActive: true,
        },
      });
      if (!term) {
        throw new NotFoundError("No active term found");
      }
    }

    // Map assessment type (CAT1 → CAT, MID → MID, EOT → EOT)
    let examType = "CAT";
    if (assessmentType === "CAT1") examType = "CAT";
    else if (assessmentType === "MID") examType = "MID";
    else if (assessmentType === "EOT") examType = "EOT";

    // Get class information with grade to determine grade level
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        grade: {
          select: {
            level: true,
            name: true,
          },
        },
      },
    });

    if (!classInfo) {
      throw new NotFoundError("Class not found");
    }

    // Resolve ECZ level: grade name takes precedence so Form classes always
    // use the 9-point Senior scale even if their enum value is GRADE_8/9
    const gradeLevel: GradeLevel = resolveECZLevel(
      classInfo.grade.level,
      classInfo.grade.name,
      classInfo.name
    );

    logger.debug("Grade level determined", {
      classId,
      gradeName: classInfo.grade.name,
      gradeLevel,
    });

    // Get assessment (include both PUBLISHED and COMPLETED statuses)
    const assessment = await prisma.assessment.findFirst({
      where: {
        subjectId,
        classId,
        termId: term.id,
        examType: examType as any,
        status: {
          in: ["PUBLISHED", "COMPLETED"],
        },
      },
    });

    // Get all enrolled students for this class
    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: {
        classId,
        academicYearId: academicYear.id,
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

    // Get assessment results if assessment exists
    let results: any[] = [];
    let recordedMale = 0;
    let recordedFemale = 0;
    let absentMale = 0;
    let absentFemale = 0;

    if (assessment) {
      results = await prisma.studentAssessmentResult.findMany({
        where: {
          assessmentId: assessment.id,
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

      // Count recorded entries (real marks) separately from absences — an AB
      // entry is stored as marksObtained=0 with isAbsent=true, so it must not
      // be counted as a recorded score, a graded result, or a failing pass/fail
      // outcome anywhere below.
      results.forEach((result) => {
        if (result.isAbsent) {
          if (result.student.gender === "MALE") absentMale++;
          else absentFemale++;
        } else if (result.marksObtained !== null) {
          if (result.student.gender === "MALE") recordedMale++;
          else recordedFemale++;
        }
      });
    }

    logger.debug("Assessment results fetched", {
      assessmentId: assessment?.id,
      totalResults: results.length,
      recordedMale,
      recordedFemale,
    });

    // Get grade distribution structure from central grading system
    const gradeDistribution = getGradeDistributionStructure(gradeLevel);

    // Categorize results by grade (absent students have no real grade to categorize)
    results.forEach((result) => {
      if (!result.isAbsent && result.grade && result.marksObtained !== null) {
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
    const totalRecorded = recordedMale + recordedFemale;
    gradeDistribution.forEach((grade) => {
      if (totalRecorded > 0) {
        grade.percentage = parseFloat(
          ((grade.total / totalRecorded) * 100).toFixed(1)
        );
      }
    });

    // Calculate pass rates against the school's configured subject pass mark
    // (admin/settings/academic-policy), not a hardcoded value.
    const passMark = await academicPolicyService.getSubjectPassMark(gradeLevel);
    const assessmentTotalMarks = assessment?.totalMarks || 100;
    const passedResults = results.filter((r) => {
      if (r.isAbsent || r.marksObtained === null) return false;
      return (r.marksObtained / assessmentTotalMarks) * 100 >= passMark;
    });
    const passed = passedResults.length;
    const quantityPassRate =
      totalRecorded > 0 ? (passed / totalRecorded) * 100 : 0;

    // Quality pass (Distinction grades based on grade level)
    const distinctionGrades = getDistinctionGrades(gradeLevel);
    const qualityPasses = results.filter(
      (r) =>
        !r.isAbsent &&
        r.marksObtained !== null &&
        r.grade &&
        distinctionGrades.includes(r.grade)
    ).length;
    const qualityPassRate = passed > 0 ? (qualityPasses / passed) * 100 : 0;

    logger.info("Assessment analysis computed successfully", {
      subjectId,
      classId,
      assessmentType,
      totalStudents,
      recordedEntries: totalRecorded,
      passRate: quantityPassRate.toFixed(1),
      qualityPassRate: qualityPassRate.toFixed(1),
    });

    return {
      gradeLevel,
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
        total: absentMale + absentFemale,
      },
      gradeDistribution: gradeDistribution as any,
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
}

// Export singleton instance
export const teacherGradebookService = new TeacherGradebookService();
