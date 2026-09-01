import { studentPromotionRepository } from "./studentPromotion.repository";
import { classRepository } from "../classes/class.repository";
import { studentRepository } from "../students/student.repository";
import { academicYearRepository } from "../academic-years/academicYear.repository";
import { termRepository } from "../terms/term.repository";
import { teacherRepository } from "../teachers/teacher.repository";
import { curriculumManagementRepository } from "../curriculum-management/curriculumManagement.repository";
import { enrollmentService } from "../enrollments/enrollment.service";
import { academicPolicyService } from "../settings/academicPolicy.service";
import { attendanceRecordService } from "../attendance/attendanceRecord.service";
import { resolveECZLevel } from "@/lib/grading/ecz-grading-system";
import { requireMinimumRole, AuthContext } from "@/lib/auth/authorization";
import { Role } from "@/types/prisma-enums";
import { NotFoundError, ValidationError } from "@/lib/errors";
import prisma from "@/lib/db/prisma";

export type PromotionAction = "PROMOTE" | "REPEAT" | "GRADUATE" | "SKIP";

export interface PromotionEntry {
  studentId: string;
  action: PromotionAction;
  targetClassId?: string;
}

export interface ExecutePromotionsInput {
  sourceClassId: string;
  targetAcademicYearId: string;
  promotions: PromotionEntry[];
  remarks?: string;
}

interface SubjectTally {
  passed: number;
  failed: number;
  incomplete: number;
}

/**
 * Student Promotion Service
 *
 * Evaluates a class's students against the Academic Policy criteria
 * (features/settings/academicPolicy.service.ts) and executes next-year
 * class enrollments for the ones an admin confirms.
 */
export class StudentPromotionService {
  /**
   * Evaluate every actively-enrolled student in a class against the
   * Academic Policy's promotion criteria for the given source academic
   * year. Read-only — does not create any records.
   */
  async evaluateClassForPromotion(
    sourceClassId: string,
    sourceAcademicYearId: string,
    context: AuthContext
  ) {
    requireMinimumRole(context, Role.ADMIN, "Only ADMIN can evaluate promotions");

    const sourceClass = await classRepository.findByIdWithGradeProgression(sourceClassId);
    if (!sourceClass) {
      throw new NotFoundError("Class not found");
    }

    const sourceAcademicYear = await academicYearRepository.findById(sourceAcademicYearId);
    if (!sourceAcademicYear) {
      throw new NotFoundError("Academic year not found");
    }

    const [enrollments, policy, terms, classSubjects] = await Promise.all([
      prisma.studentClassEnrollment.findMany({
        where: { classId: sourceClassId, academicYearId: sourceAcademicYearId, status: "ACTIVE" },
        include: { student: true },
      }),
      academicPolicyService.getPolicy(),
      termRepository.findByAcademicYear(sourceAcademicYearId),
      curriculumManagementRepository.findSubjectsByClass(sourceClassId),
    ]);

    const eczLevel = resolveECZLevel(
      sourceClass.grade.level,
      sourceClass.grade.name,
      sourceClass.name
    );
    const subjectPassMark = await academicPolicyService.getSubjectPassMark(eczLevel);
    const isPrimary = eczLevel === "PRIMARY";
    const minSubjectsPassed = isPrimary
      ? policy.primary_min_subjects_passed
      : policy.secondary_min_subjects_passed;
    const maxSubjectsFailed = isPrimary
      ? policy.primary_max_subjects_failed
      : policy.secondary_max_subjects_failed;

    const termIds = terms.map((t) => t.id);
    const assessments = termIds.length
      ? await prisma.assessment.findMany({
          where: {
            classId: sourceClassId,
            termId: { in: termIds },
            ...(policy.promotion_basis === "eot" ? { examType: "EOT" } : {}),
          },
          include: { results: true },
        })
      : [];

    // subjectId -> assessments for that subject
    const assessmentsBySubject = new Map<string, typeof assessments>();
    for (const a of assessments) {
      const list = assessmentsBySubject.get(a.subjectId) ?? [];
      list.push(a);
      assessmentsBySubject.set(a.subjectId, list);
    }

    // Resolve the destination grade/classes once for the whole class.
    const nextGrade = sourceClass.grade.nextGrade;
    const availableNextClasses = nextGrade
      ? await classRepository.findByGradeId(nextGrade.id)
      : [];
    const suggestedClass = nextGrade
      ? await classRepository.findByGradeAndName(nextGrade.id, sourceClass.name)
      : null;

    const evaluations = await Promise.all(
      enrollments.map(async (enrollment) => {
        const tally: SubjectTally = { passed: 0, failed: 0, incomplete: 0 };

        for (const cs of classSubjects) {
          const subjectAssessments = assessmentsBySubject.get(cs.subjectId) ?? [];
          const percentages: number[] = [];
          for (const a of subjectAssessments) {
            const result = a.results.find((r) => r.studentId === enrollment.studentId);
            if (!result) continue;
            const marks = result.isAbsent ? 0 : result.marksObtained;
            percentages.push((marks / a.totalMarks) * 100);
          }

          if (percentages.length === 0) {
            tally.incomplete += 1;
            continue;
          }

          const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
          if (average >= subjectPassMark) {
            tally.passed += 1;
          } else {
            tally.failed += 1;
          }
        }

        // Sum raw present/total across the source year's terms rather than
        // averaging each term's rate — an even weighting by day, not by term.
        let totalDays = 0;
        let presentDays = 0;
        for (const term of terms) {
          const stats = await attendanceRecordService.getStudentTermStatistics(
            enrollment.studentId,
            term.id,
            context
          );
          totalDays += stats.total;
          presentDays += stats.present + stats.late;
        }
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 10000) / 100 : null;

        const meetsAttendance =
          !policy.attendance_blocks_promotion ||
          attendanceRate === null ||
          attendanceRate >= policy.min_attendance_percentage;

        const meetsCriteria =
          tally.passed >= minSubjectsPassed &&
          tally.failed <= maxSubjectsFailed &&
          meetsAttendance;

        return {
          studentId: enrollment.studentId,
          studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
          admissionNumber: enrollment.student.studentNumber,
          subjectsPassed: tally.passed,
          subjectsFailed: tally.failed,
          subjectsIncomplete: tally.incomplete,
          totalSubjects: classSubjects.length,
          attendanceRate,
          meetsCriteria,
          isGraduating: !nextGrade,
          suggestedNextClassId: suggestedClass?.id ?? null,
        };
      })
    );

    return {
      sourceClass: { id: sourceClass.id, name: sourceClass.name, grade: sourceClass.grade },
      nextGrade,
      availableNextClasses,
      evaluations,
    };
  }

  /**
   * Execute a batch of promotion decisions. Runs per-student (not one giant
   * transaction) so one student's failure — e.g. their target class filled
   * up between evaluate and confirm — doesn't abort the rest of the batch,
   * matching the {successful, failed} convention used by
   * assessment.service.ts's bulkEnterResults.
   */
  async executePromotions(input: ExecutePromotionsInput, context: AuthContext) {
    requireMinimumRole(context, Role.ADMIN, "Only ADMIN can execute promotions");

    const [targetAcademicYear, sourceClass, approver] = await Promise.all([
      academicYearRepository.findById(input.targetAcademicYearId),
      classRepository.findByIdWithGradeProgression(input.sourceClassId),
      teacherRepository.findByUserId(context.userId),
    ]);

    if (!targetAcademicYear) {
      throw new NotFoundError("Target academic year not found");
    }
    if (targetAcademicYear.isClosed) {
      throw new ValidationError("Cannot promote students into a closed academic year");
    }
    if (!sourceClass) {
      throw new NotFoundError("Source class not found");
    }
    if (!approver) {
      throw new ValidationError(
        "Your account has no teacher profile; promotions must be approved by a user with one"
      );
    }

    const fromGradeLevel = sourceClass.grade.level;

    const successful: string[] = [];
    const failed: Array<{ studentId: string; error: string }> = [];

    for (const entry of input.promotions) {
      if (entry.action === "SKIP") continue;

      try {
        const student = await studentRepository.findById(entry.studentId);
        if (!student) {
          throw new NotFoundError("Student not found");
        }

        if (entry.action === "GRADUATE") {
          await studentRepository.update(entry.studentId, { status: "GRADUATED" });
          await studentPromotionRepository.create({
            student: { connect: { id: entry.studentId } },
            fromGradeLevel,
            toGradeLevel: null,
            academicYear: targetAcademicYear.year,
            status: "GRADUATED",
            remarks: input.remarks,
            approver: { connect: { id: approver.id } },
          });
          successful.push(entry.studentId);
          continue;
        }

        // PROMOTE or REPEAT
        if (!entry.targetClassId) {
          throw new ValidationError("A target class is required for this action");
        }

        const targetClass = await classRepository.findByIdWithGradeProgression(
          entry.targetClassId
        );
        if (!targetClass) {
          throw new NotFoundError("Target class not found");
        }

        await enrollmentService.createEnrollment(
          {
            studentId: entry.studentId,
            classId: entry.targetClassId,
            academicYearId: input.targetAcademicYearId,
            // Default to "today" would fail createEnrollment's own
            // within-academic-year date check whenever the target year is a
            // future year (the normal case for promotion) — anchor to the
            // target year's own start date instead.
            enrollmentDate: targetAcademicYear.startDate,
          },
          context
        );

        await studentPromotionRepository.create({
          student: { connect: { id: entry.studentId } },
          fromGradeLevel,
          toGradeLevel: targetClass.grade.level,
          academicYear: targetAcademicYear.year,
          status: entry.action === "REPEAT" ? "REPEATED" : "PROMOTED",
          remarks: input.remarks,
          approver: { connect: { id: approver.id } },
        });

        successful.push(entry.studentId);
      } catch (error) {
        failed.push({
          studentId: entry.studentId,
          error: error instanceof Error ? error.message : "Failed to process promotion",
        });
      }
    }

    return { successful: successful.length, failed };
  }
}

export const studentPromotionService = new StudentPromotionService();
