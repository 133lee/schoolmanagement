import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { SecondaryTimetable, DayOfWeek } from "@/types/prisma-enums";

/**
 * SecondaryTimetable Repository (SECONDARY SCHOOL - Grades 8-12)
 *
 * Manages complex timetables for secondary schools where:
 * - Teachers are subject specialists
 * - Teachers move between classes
 * - Clash prevention is critical (teacher/class cannot be in two places)
 * - Validation against SubjectTeacherAssignment is required
 */
export class SecondaryTimetableRepository {
  /**
   * Create a new timetable entry
   */
  async create(
    data: Prisma.SecondaryTimetableCreateInput
  ): Promise<SecondaryTimetable> {
    try {
      return await prisma.secondaryTimetable.create({
        data,
        include: {
          class: { include: { grade: true } },
          subject: true,
          teacher: true,
          timeSlot: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          const constraint = (error as any).meta?.target;
          if (constraint?.includes("class_period_unique")) {
            throw new Error("This class already has a subject scheduled at this time");
          }
          if (constraint?.includes("teacher_period_unique")) {
            throw new Error("This teacher is already scheduled to teach another class at this time");
          }
          throw new Error("Timetable clash detected");
        }
        if (error.code === "P2003") {
          throw new Error("Referenced class, subject, teacher, or time slot not found");
        }
      }
      throw error;
    }
  }

  /**
   * Find all timetable entries for a class in a term
   */
  async findByClassAndTerm(
    classId: string,
    termId: string
  ): Promise<SecondaryTimetable[]> {
    return prisma.secondaryTimetable.findMany({
      where: { classId, termId },
      include: {
        subject: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            staffNumber: true,
          },
        },
        timeSlot: true,
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { timeSlot: { startTime: "asc" } },
      ],
    });
  }

  /**
   * Find timetable for a specific day
   */
  async findByClassTermAndDay(
    classId: string,
    termId: string,
    dayOfWeek: DayOfWeek
  ): Promise<SecondaryTimetable[]> {
    return prisma.secondaryTimetable.findMany({
      where: { classId, termId, dayOfWeek },
      include: {
        subject: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        timeSlot: true,
      },
      orderBy: { timeSlot: { startTime: "asc" } },
    });
  }

  /**
   * Find teacher's timetable for a term
   */
  async findByTeacherAndTerm(
    teacherId: string,
    termId: string
  ): Promise<SecondaryTimetable[]> {
    return prisma.secondaryTimetable.findMany({
      where: { teacherId, termId },
      include: {
        class: { include: { grade: true } },
        subject: true,
        timeSlot: true,
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { timeSlot: { startTime: "asc" } },
      ],
    });
  }

  /**
   * Find teacher's schedule for a specific day
   */
  async findByTeacherTermAndDay(
    teacherId: string,
    termId: string,
    dayOfWeek: DayOfWeek
  ): Promise<SecondaryTimetable[]> {
    return prisma.secondaryTimetable.findMany({
      where: { teacherId, termId, dayOfWeek },
      include: {
        class: { include: { grade: true } },
        subject: true,
        timeSlot: true,
      },
      orderBy: { timeSlot: { startTime: "asc" } },
    });
  }

  /**
   * Check if teacher is available at a specific time
   */
  async isTeacherAvailable(
    teacherId: string,
    termId: string,
    dayOfWeek: DayOfWeek,
    timeSlotId: string
  ): Promise<boolean> {
    const count = await prisma.secondaryTimetable.count({
      where: {
        teacherId,
        termId,
        dayOfWeek,
        timeSlotId,
      },
    });
    return count === 0;
  }

  /**
   * Check if class has a free period at a specific time
   */
  async isClassAvailable(
    classId: string,
    termId: string,
    dayOfWeek: DayOfWeek,
    timeSlotId: string
  ): Promise<boolean> {
    const count = await prisma.secondaryTimetable.count({
      where: {
        classId,
        termId,
        dayOfWeek,
        timeSlotId,
      },
    });
    return count === 0;
  }

  /**
   * Find the entry (if any) already occupying this teacher's slot, with the
   * relations needed to describe the conflict to a caller.
   */
  async findTeacherConflict(
    teacherId: string,
    termId: string,
    dayOfWeek: DayOfWeek,
    timeSlotId: string
  ) {
    return prisma.secondaryTimetable.findFirst({
      where: { teacherId, termId, dayOfWeek, timeSlotId },
      include: { class: { include: { grade: true } }, subject: true, teacher: true },
    });
  }

  /**
   * Find the entry (if any) already occupying this class's slot, with the
   * relations needed to describe the conflict to a caller.
   */
  async findClassConflict(
    classId: string,
    termId: string,
    dayOfWeek: DayOfWeek,
    timeSlotId: string
  ) {
    return prisma.secondaryTimetable.findFirst({
      where: { classId, termId, dayOfWeek, timeSlotId },
      include: { teacher: true, subject: true },
    });
  }

  /**
   * All entries for a term (optionally scoped to one class), with the
   * relations needed for teacher/class clash detection.
   */
  async findByTermForClashDetection(termId: string, classId?: string) {
    return prisma.secondaryTimetable.findMany({
      where: { termId, ...(classId && { classId }) },
      include: {
        timeSlot: true,
        teacher: true,
        class: { include: { grade: true } },
        subject: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { timeSlot: { startTime: "asc" } }],
    });
  }

  /**
   * All entries on a given term+day that occupy either this teacher or this
   * class, in one query — used to check availability across every time slot
   * at once instead of querying per slot.
   */
  async findConflictsForTeacherOrClassOnDay(
    teacherId: string,
    classId: string,
    termId: string,
    dayOfWeek: DayOfWeek
  ): Promise<Array<{ timeSlotId: string; teacherId: string; classId: string }>> {
    return prisma.secondaryTimetable.findMany({
      where: {
        termId,
        dayOfWeek,
        OR: [{ teacherId }, { classId }],
      },
      select: { timeSlotId: true, teacherId: true, classId: true },
    });
  }

  /**
   * Find subject allocation for a teacher in a term
   */
  async findByTeacherSubjectAndTerm(
    teacherId: string,
    subjectId: string,
    termId: string
  ): Promise<SecondaryTimetable[]> {
    return prisma.secondaryTimetable.findMany({
      where: { teacherId, subjectId, termId },
      include: {
        class: { include: { grade: true } },
        timeSlot: true,
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { timeSlot: { startTime: "asc" } },
      ],
    });
  }

  /**
   * Update timetable entry
   */
  async update(
    id: string,
    data: Prisma.SecondaryTimetableUpdateInput
  ): Promise<SecondaryTimetable> {
    try {
      return await prisma.secondaryTimetable.update({
        where: { id },
        data,
        include: {
          class: { include: { grade: true } },
          subject: true,
          teacher: true,
          timeSlot: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Timetable entry not found");
        }
        if (error.code === "P2002") {
          throw new Error("Timetable clash detected - teacher or class not available");
        }
      }
      throw error;
    }
  }

  /**
   * Delete timetable entry
   */
  async delete(id: string): Promise<SecondaryTimetable> {
    try {
      return await prisma.secondaryTimetable.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Timetable entry not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete all timetable entries for a class in a term
   */
  async deleteByClassAndTerm(classId: string, termId: string): Promise<number> {
    const result = await prisma.secondaryTimetable.deleteMany({
      where: { classId, termId },
    });
    return result.count;
  }

  /**
   * Delete all timetable entries for a teacher in a term
   */
  async deleteByTeacherAndTerm(teacherId: string, termId: string): Promise<number> {
    const result = await prisma.secondaryTimetable.deleteMany({
      where: { teacherId, termId },
    });
    return result.count;
  }

  /**
   * Bulk create timetable entries (transaction-safe)
   */
  async bulkCreate(
    entries: Prisma.SecondaryTimetableCreateManyInput[]
  ): Promise<number> {
    const result = await prisma.secondaryTimetable.createMany({
      data: entries,
      skipDuplicates: true,
    });
    return result.count;
  }

  /**
   * Get teacher workload statistics for a term
   */
  async getTeacherWorkload(teacherId: string, termId: string) {
    const entries = await this.findByTeacherAndTerm(teacherId, termId);

    const stats = {
      totalPeriods: entries.length,
      periodsPerDay: {
        MONDAY: 0,
        TUESDAY: 0,
        WEDNESDAY: 0,
        THURSDAY: 0,
        FRIDAY: 0,
      },
      classesCount: new Set<string>(),
      subjectsCount: new Set<string>(),
    };

    entries.forEach((entry) => {
      stats.periodsPerDay[entry.dayOfWeek]++;
      stats.classesCount.add(entry.classId);
      stats.subjectsCount.add(entry.subjectId);
    });

    return {
      ...stats,
      classesCount: stats.classesCount.size,
      subjectsCount: stats.subjectsCount.size,
    };
  }

  /**
   * Count timetable entries
   */
  async count(where?: Prisma.SecondaryTimetableWhereInput): Promise<number> {
    return prisma.secondaryTimetable.count({ where });
  }
}

export const secondaryTimetableRepository = new SecondaryTimetableRepository();
