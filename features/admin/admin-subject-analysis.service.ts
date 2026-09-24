import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger/logger";
import { NotFoundError, BadRequestError } from "@/lib/http/errors";
import {
  getGradeDistributionStructure,
  getDistinctionGrades,
  resolveECZLevel,
  calculateECZGrade,
  type GradeLevel,
} from "@/lib/grading/ecz-grading-system";
import { academicPolicyService } from "@/features/settings/academicPolicy.service";
import {
  isPhysicsSubjectName,
  isChemistrySubjectName,
  COMBINED_SCIENCE_LABEL,
  COMBINED_SCIENCE_SUBJECT_ID,
} from "@/lib/grading/combined-science";
import { ECZGrade, ExamType, Role } from "@/types/prisma-enums";
import { requireMinimumRole, AuthContext } from "@/lib/auth/authorization";

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
    context: AuthContext,
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
    requireMinimumRole(
      context,
      Role.DEPUTY_HEAD,
      "Admin access required to view this report"
    );

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

    if (subjectId === COMBINED_SCIENCE_SUBJECT_ID) {
      return this.getCombinedScienceAnalysis(gradeId, termId, assessmentType, convention);
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

    // Not every class in a grade necessarily offers every subject (e.g. one
    // stream takes Geography, another takes Religious Education instead) —
    // pooling a non-offering class's students into this subject's totals
    // would misreport them as having "not sat" a subject they were never
    // enrolled in. Restrict to classes that actually have this subject.
    const offeringClassSubjects = await prisma.classSubject.findMany({
      where: { classId: { in: classes.map((c) => c.id) }, subjectId },
      select: { classId: true },
    });
    const offeringClassIds = new Set(offeringClassSubjects.map((cs) => cs.classId));
    classes = classes.filter((c) => offeringClassIds.has(c.id));

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
        examType: examType as ExamType,
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
    let explicitAbsentMale = 0;
    let explicitAbsentFemale = 0;

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

      // Count recorded entries (students who actually sat and got a real
      // mark) separately from students EXPLICITLY marked absent
      // (isAbsent=true on a result row for an assessment that actually
      // exists). A student with no result row at all — because the teacher
      // hasn't entered anything for this subject/exam yet — is neither: an
      // ungraded subject must not inflate "absent" as if every enrolled
      // student had sat and failed to show up for an exam that, as far as
      // the data shows, was never administered to them.
      results.forEach((result) => {
        if (!result.isAbsent && result.marksObtained !== null) {
          if (result.student.gender === "MALE") recordedMale++;
          else recordedFemale++;
        } else if (result.isAbsent) {
          if (result.student.gender === "MALE") explicitAbsentMale++;
          else explicitAbsentFemale++;
        }
      });
    }

    const totalRecorded = recordedMale + recordedFemale;
    const absentMale = explicitAbsentMale;
    const absentFemale = explicitAbsentFemale;
    const totalAbsent = absentMale + absentFemale;

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
      if (r.isAbsent || r.marksObtained === null) return false;
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
        !r.isAbsent &&
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
   * Grade 12 only: the combined-Science view of getGradeLevelSubjectAnalysis
   * — when a student has a real (non-absent) mark for this exam type in
   * BOTH Physics and Chemistry, their two percentages are averaged into one
   * "Science" result; when only one of the two has a mark, that one stands
   * alone as their Science result (see lib/grading/combined-science.ts).
   * Returns the exact same shape as getGradeLevelSubjectAnalysis so the
   * frontend needs no special-casing.
   */
  private async getCombinedScienceAnalysis(
    gradeId: string,
    termId: string,
    assessmentType: string,
    convention?: "standard" | "form"
  ) {
    let examType = "CAT";
    if (assessmentType === "MID") examType = "MID";
    else if (assessmentType === "EOT") examType = "EOT";

    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      select: { id: true, level: true, name: true },
    });
    if (!grade) throw new NotFoundError("Grade not found");

    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: { id: true, termType: true, academicYearId: true },
    });
    if (!term) throw new NotFoundError("Term not found");

    const allSubjects = await prisma.subject.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });
    const physicsSubject = allSubjects.find((s) => isPhysicsSubjectName(s.name));
    const chemistrySubject = allSubjects.find((s) => isChemistrySubjectName(s.name));
    if (!physicsSubject || !chemistrySubject) {
      throw new NotFoundError(
        "Physics and Chemistry subjects must both exist to analyze combined Science"
      );
    }

    const allClasses = await prisma.class.findMany({
      where: { gradeId, status: "ACTIVE" },
      select: { id: true, name: true },
    });
    const isFormName = (name: string) =>
      /\bForm\s*[1-9]\b|^F[1-9][\s\-]/i.test(name);
    let classes = allClasses;
    let gradeLevel: GradeLevel;
    if (convention === "standard") {
      classes = allClasses.filter((c) => !isFormName(c.name));
      gradeLevel = "JUNIOR";
    } else if (convention === "form") {
      classes = allClasses.filter((c) => isFormName(c.name));
      gradeLevel = "SENIOR";
    } else {
      const formClass = allClasses.find((c) => isFormName(c.name));
      gradeLevel = resolveECZLevel(grade.level, grade.name, formClass?.name);
    }

    // Classes offering EITHER Physics or Chemistry — a class offering only
    // one still contributes its students' standalone results.
    const offering = await prisma.classSubject.findMany({
      where: {
        classId: { in: classes.map((c) => c.id) },
        subjectId: { in: [physicsSubject.id, chemistrySubject.id] },
      },
      select: { classId: true },
    });
    const offeringIds = new Set(offering.map((cs) => cs.classId));
    classes = classes.filter((c) => offeringIds.has(c.id));
    const classIds = classes.map((c) => c.id);

    if (classes.length === 0) {
      const emptyGradeDistribution = getGradeDistributionStructure(gradeLevel);
      return {
        gradeLevel,
        gradeName: grade.name,
        subjectName: COMBINED_SCIENCE_LABEL,
        totalClasses: 0,
        totalStudents: { male: 0, female: 0, total: 0 },
        recordedEntries: { male: 0, female: 0, total: 0 },
        absentStudents: { male: 0, female: 0, total: 0 },
        gradeDistribution: emptyGradeDistribution,
        quantityPass: { passed: 0, total: 0, rate: 0 },
        qualityPass: { qualityPasses: 0, totalPassed: 0, rate: 0 },
      };
    }

    const enrollments = await prisma.studentClassEnrollment.findMany({
      where: { classId: { in: classIds }, academicYearId: term.academicYearId, status: "ACTIVE" },
      include: { student: { select: { id: true, gender: true } } },
    });
    const students = enrollments.map((e) => e.student);
    const totalMale = students.filter((s) => s.gender === "MALE").length;
    const totalFemale = students.filter((s) => s.gender === "FEMALE").length;
    const totalStudents = students.length;
    const studentGenderMap = new Map(students.map((s) => [s.id, s.gender]));

    const assessments = await prisma.assessment.findMany({
      where: {
        subjectId: { in: [physicsSubject.id, chemistrySubject.id] },
        classId: { in: classIds },
        termId,
        examType: examType as ExamType,
        status: { in: ["PUBLISHED", "COMPLETED"] },
      },
      select: { id: true, subjectId: true, totalMarks: true },
    });
    const assessmentIds = assessments.map((a) => a.id);
    const assessmentSubject = new Map(assessments.map((a) => [a.id, a.subjectId]));
    const assessmentTotalMarks = new Map(assessments.map((a) => [a.id, a.totalMarks]));

    const rawResults =
      assessmentIds.length === 0
        ? []
        : await prisma.studentAssessmentResult.findMany({
            where: {
              assessmentId: { in: assessmentIds },
              studentId: { in: students.map((s) => s.id) },
            },
            select: {
              studentId: true,
              assessmentId: true,
              marksObtained: true,
              isAbsent: true,
            },
          });

    // Merge per student: average Physics + Chemistry percentages when both
    // have a real mark, otherwise whichever one does stands alone. Absence
    // is tracked separately from "no data at all" — a student only counts
    // as absent if EXPLICITLY marked isAbsent on an existing Physics or
    // Chemistry result; a student with no result row for either (e.g. a
    // teacher hasn't entered marks for this exam type yet) isn't counted
    // as sat or absent, since nothing has actually happened for them yet.
    interface StudentSciencePct {
      physicsPct: number | null;
      chemistryPct: number | null;
      physicsAbsent: boolean;
      chemistryAbsent: boolean;
    }
    const byStudent = new Map<string, StudentSciencePct>();
    for (const r of rawResults) {
      const subjId = assessmentSubject.get(r.assessmentId);
      const entry =
        byStudent.get(r.studentId) ||
        { physicsPct: null, chemistryPct: null, physicsAbsent: false, chemistryAbsent: false };
      if (r.isAbsent) {
        if (subjId === physicsSubject.id) entry.physicsAbsent = true;
        else if (subjId === chemistrySubject.id) entry.chemistryAbsent = true;
      } else if (r.marksObtained !== null) {
        const totalMarks = assessmentTotalMarks.get(r.assessmentId) || 100;
        const percentage = (r.marksObtained / totalMarks) * 100;
        if (subjId === physicsSubject.id) entry.physicsPct = percentage;
        else if (subjId === chemistrySubject.id) entry.chemistryPct = percentage;
      }
      byStudent.set(r.studentId, entry);
    }

    const mergedResults: Array<{ gender: "MALE" | "FEMALE"; percentage: number; grade: ECZGrade }> = [];
    let explicitAbsentMale = 0;
    let explicitAbsentFemale = 0;
    for (const [studentId, entry] of byStudent) {
      const gender = studentGenderMap.get(studentId);
      if (!gender) continue;
      let percentage: number;
      if (entry.physicsPct !== null && entry.chemistryPct !== null) {
        percentage = (entry.physicsPct + entry.chemistryPct) / 2;
      } else if (entry.physicsPct !== null) {
        percentage = entry.physicsPct;
      } else if (entry.chemistryPct !== null) {
        percentage = entry.chemistryPct;
      } else if (entry.physicsAbsent || entry.chemistryAbsent) {
        if (gender === "MALE") explicitAbsentMale++;
        else explicitAbsentFemale++;
        continue;
      } else {
        continue;
      }
      mergedResults.push({ gender, percentage, grade: calculateECZGrade(percentage, gradeLevel) });
    }

    const recordedMale = mergedResults.filter((r) => r.gender === "MALE").length;
    const recordedFemale = mergedResults.filter((r) => r.gender === "FEMALE").length;
    const totalRecorded = recordedMale + recordedFemale;
    const absentMale = explicitAbsentMale;
    const absentFemale = explicitAbsentFemale;
    const totalAbsent = absentMale + absentFemale;

    const gradeDistribution = getGradeDistributionStructure(gradeLevel);
    mergedResults.forEach((r) => {
      const gradeEntry = gradeDistribution.find((g) => g.gradeEnum === r.grade);
      if (gradeEntry) {
        gradeEntry.total++;
        if (r.gender === "MALE") gradeEntry.male++;
        else gradeEntry.female++;
      }
    });
    gradeDistribution.forEach((g) => {
      if (totalRecorded > 0) {
        g.percentage = parseFloat(((g.total / totalRecorded) * 100).toFixed(1));
      }
    });

    const passMark = await academicPolicyService.getSubjectPassMark(gradeLevel);
    const passed = mergedResults.filter((r) => r.percentage >= passMark).length;
    const quantityPassRate = totalRecorded > 0 ? (passed / totalRecorded) * 100 : 0;

    const distinctionGrades = getDistinctionGrades(gradeLevel);
    const qualityPasses = mergedResults.filter((r) => distinctionGrades.includes(r.grade)).length;
    const qualityPassRate = passed > 0 ? (qualityPasses / passed) * 100 : 0;

    logger.info("Combined Science analysis computed successfully", {
      gradeId,
      termId,
      assessmentType,
      totalClasses: classes.length,
      totalStudents,
      recordedEntries: totalRecorded,
    });

    return {
      gradeLevel,
      gradeName: grade.name,
      subjectName: COMBINED_SCIENCE_LABEL,
      totalClasses: classes.length,
      totalStudents: { male: totalMale, female: totalFemale, total: totalStudents },
      recordedEntries: { male: recordedMale, female: recordedFemale, total: totalRecorded },
      absentStudents: { male: absentMale, female: absentFemale, total: totalAbsent },
      gradeDistribution,
      quantityPass: { passed, total: totalRecorded, rate: parseFloat(quantityPassRate.toFixed(1)) },
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
    context: AuthContext,
    convention?: "standard" | "form"
  ) {
    // Get overall analysis — this also enforces the role check below, since
    // it's the single entry point every code path in this method funnels
    // through before touching any data.
    const overall = await this.getGradeLevelSubjectAnalysis(
      gradeId,
      subjectId,
      termId,
      assessmentType,
      context,
      convention
    );

    // Per-class breakdown isn't supported for the combined-Science view —
    // merging Physics + Chemistry per class would duplicate the same
    // per-student merge logic a second time for comparatively little value.
    // The grade-wide "overall" figures above are still fully correct.
    if (subjectId === COMBINED_SCIENCE_SUBJECT_ID) {
      return { overall, streamBreakdown: [] };
    }

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

    const conventionFilteredClasses =
      convention === "standard"
        ? allStreamClasses.filter((c) => !isFormName(c.name))
        : convention === "form"
        ? allStreamClasses.filter((c) => isFormName(c.name))
        : allStreamClasses;

    // As in getGradeLevelSubjectAnalysis: only include classes that actually
    // offer this subject, so a stream that doesn't teach it isn't shown as
    // having 100% of its students "absent" from an exam they never sat.
    const streamOfferingClassSubjects = await prisma.classSubject.findMany({
      where: {
        classId: { in: conventionFilteredClasses.map((c) => c.id) },
        subjectId,
      },
      select: { classId: true },
    });
    const streamOfferingClassIds = new Set(
      streamOfferingClassSubjects.map((cs) => cs.classId)
    );
    const classes = conventionFilteredClasses.filter((c) =>
      streamOfferingClassIds.has(c.id)
    );

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
            examType: examType as ExamType,
            status: {
              in: ["PUBLISHED", "COMPLETED"],
            },
          },
        });

        if (!assessment) {
          // No assessment exists for this class/exam type at all yet — that
          // means nothing has happened for these students, not that every
          // one of them was absent from an exam that was never administered.
          return {
            className: classItem.name,
            enrolled: totalEnrolled,
            sat: 0,
            absent: 0,
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

        const sat = results.filter((r) => !r.isAbsent && r.marksObtained !== null).length;
        // Only students explicitly marked isAbsent count as absent — a
        // student with no result row at all (mark just not entered yet)
        // isn't the same as one marked absent from an exam that happened.
        const absent = results.filter((r) => r.isAbsent).length;

        // Calculate pass rate against the school's configured subject pass mark.
        const passed = results.filter((r) => {
          if (r.isAbsent || r.marksObtained === null) return false;
          const percentage = (r.marksObtained / assessment.totalMarks) * 100;
          return percentage >= passMark;
        }).length;
        const passRate = sat > 0 ? parseFloat(((passed / sat) * 100).toFixed(1)) : 0;

        const distinctionGrades = getDistinctionGrades(overall.gradeLevel);
        const qualityPasses = results.filter(
          (r) =>
            !r.isAbsent &&
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
