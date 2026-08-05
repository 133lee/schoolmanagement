import { SubjectPeriodRequirement } from "@/types/prisma-enums";
import { subjectPeriodRequirementRepository } from "./subjectPeriodRequirement.repository";
import prisma from "@/lib/db/prisma";

/**
 * SubjectPeriodRequirement Service
 *
 * Manages curriculum requirements for periods per week.
 * Example: "Math = 5 periods/week", "Science = 4 periods/week"
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// NOTE: HOD is a POSITION (Department.hodTeacherId), not a role
export interface ServiceContext {
  userId: string;
  role: "ADMIN" | "HEAD_TEACHER" | "DEPUTY_HEAD" | "TEACHER" | "CLERK";
}

export interface CreateRequirementInput {
  gradeId: string;
  subjectId: string;
  periodsPerWeek: number;
}

export interface ValidationReport {
  isValid: boolean;
  discrepancies: {
    subjectId: string;
    subjectName: string;
    required: number;
    actual: number;
    difference: number;
  }[];
}

export class SubjectPeriodRequirementService {
  private readonly MAX_PERIODS_PER_WEEK = 40; // 8 periods x 5 days
  private readonly MIN_PERIODS = 1;

  /**
   * Check if user can manage requirements
   */
  private canManageRequirements(context: ServiceContext): boolean {
    return ["ADMIN", "HEAD_TEACHER"].includes(context.role);
  }

  /**
   * Validate periods per week is in acceptable range
   */
  private validatePeriodsPerWeek(periods: number): void {
    if (periods < this.MIN_PERIODS || periods > this.MAX_PERIODS_PER_WEEK) {
      throw new ValidationError(
        `Periods per week must be between ${this.MIN_PERIODS} and ${this.MAX_PERIODS_PER_WEEK}`
      );
    }
  }

  /**
   * Validate total periods for grade doesn't exceed available slots
   */
  private async validateTotalPeriods(
    gradeId: string,
    newPeriods: number,
    excludeSubjectId?: string
  ): Promise<void> {
    const requirements = await subjectPeriodRequirementRepository.findByGrade(
      gradeId
    );

    const total = requirements
      .filter((req) => req.subjectId !== excludeSubjectId)
      .reduce((sum, req) => sum + req.periodsPerWeek, 0);

    const grandTotal = total + newPeriods;

    if (grandTotal > this.MAX_PERIODS_PER_WEEK) {
      throw new ValidationError(
        `Total periods (${grandTotal}) would exceed maximum ${this.MAX_PERIODS_PER_WEEK} periods per week`
      );
    }
  }

  /**
   * Create requirement
   */
  async createRequirement(
    data: CreateRequirementInput,
    context: ServiceContext
  ): Promise<SubjectPeriodRequirement> {
    // Authorization
    if (!this.canManageRequirements(context)) {
      throw new UnauthorizedError(
        "Only ADMIN or HEAD_TEACHER can manage period requirements"
      );
    }

    // Validate periods
    this.validatePeriodsPerWeek(data.periodsPerWeek);

    // Validate total doesn't exceed limit
    await this.validateTotalPeriods(data.gradeId, data.periodsPerWeek);

    // Validate grade and subject exist
    const [grade, subject] = await Promise.all([
      prisma.grade.findUnique({ where: { id: data.gradeId } }),
      prisma.subject.findUnique({ where: { id: data.subjectId } }),
    ]);

    if (!grade) throw new NotFoundError("Grade not found");
    if (!subject) throw new NotFoundError("Subject not found");

    return subjectPeriodRequirementRepository.create({
      grade: { connect: { id: data.gradeId } },
      subject: { connect: { id: data.subjectId } },
      periodsPerWeek: data.periodsPerWeek,
    });
  }

  /**
   * Get all requirements for a grade
   */
  async getGradeRequirements(
    gradeId: string
  ): Promise<SubjectPeriodRequirement[]> {
    return subjectPeriodRequirementRepository.findByGrade(gradeId);
  }

  /**
   * Get requirement for specific grade and subject
   */
  async getRequirement(
    gradeId: string,
    subjectId: string
  ): Promise<SubjectPeriodRequirement | null> {
    return subjectPeriodRequirementRepository.findByGradeAndSubject(
      gradeId,
      subjectId
    );
  }

  /**
   * Get all requirements for a subject across grades
   */
  async getSubjectRequirements(
    subjectId: string
  ): Promise<SubjectPeriodRequirement[]> {
    return subjectPeriodRequirementRepository.findBySubject(subjectId);
  }

  /**
   * Update requirement
   */
  async updateRequirement(
    id: string,
    periodsPerWeek: number,
    context: ServiceContext
  ): Promise<SubjectPeriodRequirement> {
    // Authorization
    if (!this.canManageRequirements(context)) {
      throw new UnauthorizedError(
        "Only ADMIN or HEAD_TEACHER can manage period requirements"
      );
    }

    // Get current requirement
    const current = await prisma.subjectPeriodRequirement.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundError("Period requirement not found");
    }

    // Validate new periods
    this.validatePeriodsPerWeek(periodsPerWeek);

    // Validate total doesn't exceed limit (exclude current requirement)
    await this.validateTotalPeriods(
      current.gradeId,
      periodsPerWeek,
      current.subjectId
    );

    return subjectPeriodRequirementRepository.update(id, { periodsPerWeek });
  }

  /**
   * Delete requirement
   */
  async deleteRequirement(
    id: string,
    context: ServiceContext
  ): Promise<void> {
    // Authorization
    if (!this.canManageRequirements(context)) {
      throw new UnauthorizedError(
        "Only ADMIN or HEAD_TEACHER can manage period requirements"
      );
    }

    await subjectPeriodRequirementRepository.delete(id);
  }

  /**
   * Bulk create requirements for a grade
   */
  async bulkCreateForGrade(
    gradeId: string,
    requirements: { subjectId: string; periodsPerWeek: number }[],
    context: ServiceContext
  ): Promise<number> {
    // Authorization
    if (!this.canManageRequirements(context)) {
      throw new UnauthorizedError(
        "Only ADMIN or HEAD_TEACHER can manage period requirements"
      );
    }

    // Validate all periods
    requirements.forEach((req) => {
      this.validatePeriodsPerWeek(req.periodsPerWeek);
    });

    // Validate total
    const total = requirements.reduce((sum, req) => sum + req.periodsPerWeek, 0);
    if (total > this.MAX_PERIODS_PER_WEEK) {
      throw new ValidationError(
        `Total periods (${total}) exceeds maximum ${this.MAX_PERIODS_PER_WEEK} periods per week`
      );
    }

    // Validate grade exists
    const grade = await prisma.grade.findUnique({ where: { id: gradeId } });
    if (!grade) throw new NotFoundError("Grade not found");

    return subjectPeriodRequirementRepository.bulkCreateForGrade(
      gradeId,
      requirements
    );
  }

  /**
   * Get total periods required for a grade
   */
  async getTotalPeriodsForGrade(gradeId: string): Promise<number> {
    return subjectPeriodRequirementRepository.getTotalPeriodsForGrade(gradeId);
  }

  /**
   * Validate timetable compliance
   */
  async validateTimetableCompliance(
    classId: string,
    termId: string,
    isPrimary: boolean
  ): Promise<ValidationReport> {
    const discrepancies =
      await subjectPeriodRequirementRepository.validateTimetable(
        classId,
        termId,
        isPrimary
      );

    // Enrich with subject names
    const enrichedDiscrepancies = await Promise.all(
      discrepancies.map(async (disc) => {
        const subject = await prisma.subject.findUnique({
          where: { id: disc.subjectId },
        });
        return {
          ...disc,
          subjectName: subject?.name || "Unknown",
          difference: disc.actual - disc.required,
        };
      })
    );

    return {
      isValid: enrichedDiscrepancies.length === 0,
      discrepancies: enrichedDiscrepancies,
    };
  }

  /**
   * Get compliance summary for all classes in a grade
   */
  async getGradeComplianceSummary(gradeId: string, termId: string) {
    const classes = await prisma.class.findMany({
      where: { gradeId, status: "ACTIVE" },
      include: { grade: true },
    });

    const isPrimary = classes[0]?.grade.schoolLevel === "PRIMARY";

    const results = await Promise.all(
      classes.map(async (cls) => {
        const validation = await this.validateTimetableCompliance(
          cls.id,
          termId,
          isPrimary
        );
        return {
          classId: cls.id,
          className: cls.name,
          isCompliant: validation.isValid,
          issueCount: validation.discrepancies.length,
        };
      })
    );

    return results;
  }
}

export const subjectPeriodRequirementService = new SubjectPeriodRequirementService();
