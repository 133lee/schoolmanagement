import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { ClassTimetable, DayOfWeek } from "@/types/prisma-enums";

/**
 * ClassTimetable Repository (PRIMARY SCHOOL - Grades 1-7)
 *
 * Manages simple timetables for primary schools where:
 * - One class teacher handles most subjects
 * - Some subjects (Art, ICT, PE) may have specialist teachers
 * - Timetable is term-based and rarely changes
 */
export class ClassTimetableRepository {
  /**
   * Create a new timetable entry
   */
  async create(data: Prisma.ClassTimetableCreateInput): Promise<ClassTimetable> {
    try {
      return await prisma.classTimetable.create({
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
          throw new Error("This time slot is already occupied for this class");
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
  ): Promise<ClassTimetable[]> {
    return prisma.classTimetable.findMany({
      where: { classId, termId },
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
  ): Promise<ClassTimetable[]> {
    return prisma.classTimetable.findMany({
      where: { classId, termId, dayOfWeek },
      include: {
        subject: true,
        teacher: true,
        timeSlot: true,
      },
      orderBy: { timeSlot: { startTime: "asc" } },
    });
  }

  /**
   * Find timetable by teacher (for specialist teachers)
   */
  async findByTeacherAndTerm(
    teacherId: string,
    termId: string
  ): Promise<ClassTimetable[]> {
    return prisma.classTimetable.findMany({
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
   * Find specific timetable entry
   */
  async findUnique(
    classId: string,
    termId: string,
    dayOfWeek: DayOfWeek,
    timeSlotId: string
  ): Promise<ClassTimetable | null> {
    return prisma.classTimetable.findUnique({
      where: {
        classId_termId_dayOfWeek_timeSlotId: {
          classId,
          termId,
          dayOfWeek,
          timeSlotId,
        },
      },
      include: {
        subject: true,
        teacher: true,
        timeSlot: true,
      },
    });
  }

  /**
   * Update timetable entry
   */
  async update(
    id: string,
    data: Prisma.ClassTimetableUpdateInput
  ): Promise<ClassTimetable> {
    try {
      return await prisma.classTimetable.update({
        where: { id },
        data,
        include: {
          class: true,
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
          throw new Error("This time slot is already occupied");
        }
      }
      throw error;
    }
  }

  /**
   * Delete timetable entry
   */
  async delete(id: string): Promise<ClassTimetable> {
    try {
      return await prisma.classTimetable.delete({
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
    const result = await prisma.classTimetable.deleteMany({
      where: { classId, termId },
    });
    return result.count;
  }

  /**
   * Bulk create timetable entries (transaction-safe)
   */
  async bulkCreate(
    entries: Prisma.ClassTimetableCreateManyInput[]
  ): Promise<number> {
    const result = await prisma.classTimetable.createMany({
      data: entries,
      skipDuplicates: true,
    });
    return result.count;
  }

  /**
   * Copy timetable from one term to another
   */
  async copyTimetable(
    sourceClassId: string,
    sourceTermId: string,
    targetClassId: string,
    targetTermId: string
  ): Promise<number> {
    const sourceTimetable = await this.findByClassAndTerm(sourceClassId, sourceTermId);

    const newEntries = sourceTimetable.map((entry) => ({
      classId: targetClassId,
      termId: targetTermId,
      academicYearId: entry.academicYearId,
      dayOfWeek: entry.dayOfWeek,
      timeSlotId: entry.timeSlotId,
      subjectId: entry.subjectId,
      teacherId: entry.teacherId,
    }));

    return this.bulkCreate(newEntries);
  }

  /**
   * Count timetable entries
   */
  async count(where?: Prisma.ClassTimetableWhereInput): Promise<number> {
    return prisma.classTimetable.count({ where });
  }
}

export const classTimetableRepository = new ClassTimetableRepository();
