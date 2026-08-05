import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { SubjectPeriodRequirement } from "@/types/prisma-enums";

/**
 * SubjectPeriodRequirement Repository
 *
 * Manages curriculum requirements for how many periods per week
 * each subject should have at each grade level.
 * Example: "Math = 5 periods/week", "Science = 4 periods/week"
 */
export class SubjectPeriodRequirementRepository {
  /**
   * Create a new period requirement
   */
  async create(
    data: Prisma.SubjectPeriodRequirementCreateInput
  ): Promise<SubjectPeriodRequirement> {
    try {
      return await prisma.subjectPeriodRequirement.create({
        data,
        include: {
          grade: true,
          subject: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Period requirement already exists for this grade and subject");
        }
        if (error.code === "P2003") {
          throw new Error("Referenced grade or subject not found");
        }
      }
      throw error;
    }
  }

  /**
   * Find all requirements for a grade
   */
  async findByGrade(gradeId: string): Promise<SubjectPeriodRequirement[]> {
    return prisma.subjectPeriodRequirement.findMany({
      where: { gradeId },
      include: {
        subject: true,
      },
      orderBy: {
        subject: { name: "asc" },
      },
    });
  }

  /**
   * Find requirement for a specific grade and subject
   */
  async findByGradeAndSubject(
    gradeId: string,
    subjectId: string
  ): Promise<SubjectPeriodRequirement | null> {
    return prisma.subjectPeriodRequirement.findUnique({
      where: {
        gradeId_subjectId: {
          gradeId,
          subjectId,
        },
      },
      include: {
        grade: true,
        subject: true,
      },
    });
  }

  /**
   * Find all requirements for a subject across all grades
   */
  async findBySubject(subjectId: string): Promise<SubjectPeriodRequirement[]> {
    return prisma.subjectPeriodRequirement.findMany({
      where: { subjectId },
      include: {
        grade: true,
      },
      orderBy: {
        grade: { sequence: "asc" },
      },
    });
  }

  /**
   * Update period requirement
   */
  async update(
    id: string,
    data: Prisma.SubjectPeriodRequirementUpdateInput
  ): Promise<SubjectPeriodRequirement> {
    try {
      return await prisma.subjectPeriodRequirement.update({
        where: { id },
        data,
        include: {
          grade: true,
          subject: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Period requirement not found");
        }
        if (error.code === "P2002") {
          throw new Error("Period requirement already exists for this grade and subject");
        }
      }
      throw error;
    }
  }

  /**
   * Delete period requirement
   */
  async delete(id: string): Promise<SubjectPeriodRequirement> {
    try {
      return await prisma.subjectPeriodRequirement.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Period requirement not found");
        }
      }
      throw error;
    }
  }

  /**
   * Bulk create period requirements for a grade
   */
  async bulkCreateForGrade(
    gradeId: string,
    requirements: { subjectId: string; periodsPerWeek: number }[]
  ): Promise<number> {
    const data = requirements.map((req) => ({
      gradeId,
      subjectId: req.subjectId,
      periodsPerWeek: req.periodsPerWeek,
    }));

    const result = await prisma.subjectPeriodRequirement.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count;
  }

  /**
   * Get total periods required per week for a grade
   */
  async getTotalPeriodsForGrade(gradeId: string): Promise<number> {
    const requirements = await this.findByGrade(gradeId);
    return requirements.reduce((sum, req) => sum + req.periodsPerWeek, 0);
  }

  /**
   * Validate if timetable meets period requirements
   * Returns subjects that don't meet their required period count
   */
  async validateTimetable(
    classId: string,
    termId: string,
    isPrimary: boolean
  ): Promise<{ subjectId: string; required: number; actual: number }[]> {
    // Get the class's grade
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: { grade: true },
    });

    if (!classData) {
      throw new Error("Class not found");
    }

    // Get period requirements for this grade
    const requirements = await this.findByGrade(classData.gradeId);

    // Count actual periods in timetable
    const timetableEntries = isPrimary
      ? await prisma.classTimetable.findMany({
          where: { classId, termId },
        })
      : await prisma.secondaryTimetable.findMany({
          where: { classId, termId },
        });

    // Group by subject
    const actualCounts = new Map<string, number>();
    timetableEntries.forEach((entry) => {
      const count = actualCounts.get(entry.subjectId) || 0;
      actualCounts.set(entry.subjectId, count + 1);
    });

    // Find discrepancies
    const discrepancies: { subjectId: string; required: number; actual: number }[] = [];
    requirements.forEach((req) => {
      const actual = actualCounts.get(req.subjectId) || 0;
      if (actual !== req.periodsPerWeek) {
        discrepancies.push({
          subjectId: req.subjectId,
          required: req.periodsPerWeek,
          actual,
        });
      }
    });

    return discrepancies;
  }

  /**
   * Count requirements
   */
  async count(where?: Prisma.SubjectPeriodRequirementWhereInput): Promise<number> {
    return prisma.subjectPeriodRequirement.count({ where });
  }
}

export const subjectPeriodRequirementRepository = new SubjectPeriodRequirementRepository();
