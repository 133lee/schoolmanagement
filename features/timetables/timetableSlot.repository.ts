import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { TimetableSlot, DayOfWeek } from "@/types/prisma-enums";

/**
 * TimetableSlot Repository - Data Access Layer
 *
 * Manages class timetables/schedules.
 * No business logic - pure data access.
 */
export class TimetableSlotRepository {
  /**
   * Create a new timetable slot
   */
  async create(data: Prisma.TimetableSlotCreateInput): Promise<TimetableSlot> {
    try {
      return await prisma.timetableSlot.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("A slot already exists for this class, day, and period");
        }
        if (error.code === "P2003") {
          throw new Error("Referenced class, subject, teacher, or academic year not found");
        }
      }
      throw error;
    }
  }

  /**
   * Create timetable slot within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.TimetableSlotCreateInput
  ): Promise<TimetableSlot> {
    return tx.timetableSlot.create({ data });
  }

  /**
   * Find timetable slot by ID
   */
  async findById(id: string): Promise<TimetableSlot | null> {
    return prisma.timetableSlot.findUnique({
      where: { id },
    });
  }

  /**
   * Find timetable slot by ID with relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.timetableSlot.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            grade: true,
          },
        },
        subject: true,
        teacher: true,
        academicYear: true,
      },
    });
  }

  /**
   * Find all timetable slots
   */
  async findAll(): Promise<TimetableSlot[]> {
    return prisma.timetableSlot.findMany({
      orderBy: [
        { dayOfWeek: "asc" },
        { periodNumber: "asc" },
      ],
      include: {
        class: {
          select: {
            name: true,
            grade: {
              select: {
                name: true,
              },
            },
          },
        },
        subject: {
          select: {
            name: true,
            code: true,
          },
        },
        teacher: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Find timetable slots by class
   */
  async findByClass(classId: string): Promise<TimetableSlot[]> {
    return prisma.timetableSlot.findMany({
      where: { classId },
      orderBy: [
        { dayOfWeek: "asc" },
        { periodNumber: "asc" },
      ],
      include: {
        subject: true,
        teacher: true,
      },
    });
  }

  /**
   * Find timetable slots by teacher, scoped to a specific academic year.
   * academicYearId is required to avoid returning stale slots from previous years.
   */
  async findByTeacher(teacherId: string, academicYearId: string): Promise<TimetableSlot[]> {
    return prisma.timetableSlot.findMany({
      where: { teacherId, academicYearId },
      orderBy: [
        { dayOfWeek: "asc" },
        { periodNumber: "asc" },
      ],
      include: {
        class: {
          include: {
            grade: true,
          },
        },
        subject: true,
      },
    });
  }

  /**
   * Find timetable slots by subject
   */
  async findBySubject(subjectId: string): Promise<TimetableSlot[]> {
    return prisma.timetableSlot.findMany({
      where: { subjectId },
      orderBy: [
        { dayOfWeek: "asc" },
        { periodNumber: "asc" },
      ],
      include: {
        class: {
          include: {
            grade: true,
          },
        },
        teacher: true,
      },
    });
  }

  /**
   * Find timetable slots by academic year
   */
  async findByAcademicYear(academicYearId: string): Promise<TimetableSlot[]> {
    return prisma.timetableSlot.findMany({
      where: { academicYearId },
      orderBy: [
        { dayOfWeek: "asc" },
        { periodNumber: "asc" },
      ],
      include: {
        class: {
          include: {
            grade: true,
          },
        },
        subject: true,
        teacher: true,
      },
    });
  }

  /**
   * Find timetable slots by class and academic year
   */
  async findByClassAndYear(
    classId: string,
    academicYearId: string
  ): Promise<TimetableSlot[]> {
    return prisma.timetableSlot.findMany({
      where: {
        classId,
        academicYearId,
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { periodNumber: "asc" },
      ],
      include: {
        subject: true,
        teacher: true,
      },
    });
  }

  /**
   * Find timetable slots by day of week
   */
  async findByDay(dayOfWeek: DayOfWeek): Promise<TimetableSlot[]> {
    return prisma.timetableSlot.findMany({
      where: { dayOfWeek },
      orderBy: { periodNumber: "asc" },
      include: {
        class: {
          include: {
            grade: true,
          },
        },
        subject: true,
        teacher: true,
      },
    });
  }

  /**
   * Find timetable slots by class and day
   */
  async findByClassAndDay(
    classId: string,
    dayOfWeek: DayOfWeek
  ): Promise<TimetableSlot[]> {
    return prisma.timetableSlot.findMany({
      where: {
        classId,
        dayOfWeek,
      },
      orderBy: { periodNumber: "asc" },
      include: {
        subject: true,
        teacher: true,
      },
    });
  }

  /**
   * Find timetable slot by unique constraint
   */
  async findByClassDayPeriod(
    classId: string,
    dayOfWeek: DayOfWeek,
    periodNumber: number,
    academicYearId: string
  ): Promise<TimetableSlot | null> {
    return prisma.timetableSlot.findUnique({
      where: {
        classId_academicYearId_dayOfWeek_periodNumber: {
          classId,
          academicYearId,
          dayOfWeek,
          periodNumber,
        },
      },
    });
  }

  /**
   * Check if teacher has conflict at specific time
   */
  async checkTeacherConflict(
    teacherId: string,
    dayOfWeek: DayOfWeek,
    periodNumber: number,
    academicYearId: string,
    excludeSlotId?: string
  ): Promise<boolean> {
    const conflict = await prisma.timetableSlot.findFirst({
      where: {
        teacherId,
        dayOfWeek,
        periodNumber,
        academicYearId,
        ...(excludeSlotId ? { id: { not: excludeSlotId } } : {}),
      },
    });
    return conflict !== null;
  }

  /**
   * Find many with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.TimetableSlotWhereInput;
    orderBy?: Prisma.TimetableSlotOrderByWithRelationInput;
    include?: Prisma.TimetableSlotInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;

    return prisma.timetableSlot.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || [
        { dayOfWeek: "asc" },
        { periodNumber: "asc" },
      ],
      include: include || {
        class: {
          include: {
            grade: true,
          },
        },
        subject: true,
        teacher: true,
      },
    });
  }

  /**
   * Find every slot matching the filter, unbounded — for the admin grid view
   * and PDF export, which need the complete dataset for a school year (at
   * most a few hundred rows), not a paginated page of it. Deliberately
   * bypasses findMany()'s take/skip pagination cap, which exists for list
   * UIs, not for a caller that needs the whole picture at once.
   */
  async findAllUnbounded(
    where?: Prisma.TimetableSlotWhereInput,
    orderBy?: Prisma.TimetableSlotOrderByWithRelationInput | Prisma.TimetableSlotOrderByWithRelationInput[],
    include?: Prisma.TimetableSlotInclude
  ) {
    return prisma.timetableSlot.findMany({
      where,
      orderBy: orderBy || [{ dayOfWeek: "asc" }, { periodNumber: "asc" }],
      include: include || {
        class: {
          include: {
            grade: true,
          },
        },
        subject: true,
        teacher: true,
      },
    });
  }

  /**
   * Count timetable slots
   */
  async count(where?: Prisma.TimetableSlotWhereInput): Promise<number> {
    return prisma.timetableSlot.count({ where });
  }

  /**
   * Update timetable slot
   */
  async update(
    id: string,
    data: Prisma.TimetableSlotUpdateInput
  ): Promise<TimetableSlot> {
    try {
      return await prisma.timetableSlot.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Timetable slot not found");
        }
        if (error.code === "P2002") {
          throw new Error("A slot already exists for this class, day, and period");
        }
      }
      throw error;
    }
  }

  /**
   * Delete timetable slot
   */
  async delete(id: string): Promise<TimetableSlot> {
    try {
      return await prisma.timetableSlot.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Timetable slot not found");
        }
      }
      throw error;
    }
  }

  /**
   * Delete all slots for a class and academic year
   */
  async deleteByClassAndYear(
    classId: string,
    academicYearId: string
  ): Promise<Prisma.BatchPayload> {
    return prisma.timetableSlot.deleteMany({
      where: {
        classId,
        academicYearId,
      },
    });
  }

  /**
   * Bulk create timetable slots
   */
  async bulkCreate(
    data: Prisma.TimetableSlotCreateManyInput[]
  ): Promise<Prisma.BatchPayload> {
    return prisma.timetableSlot.createMany({
      data,
      skipDuplicates: true,
    });
  }

  /**
   * Transaction wrapper
   */
  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(fn);
  }

  /**
   * Find a slot occupying a specific class/day/period, excluding one slot ID
   * (used to check whether a target cell is free before moving another slot into it)
   */
  async findConflictExcluding(
    classId: string,
    academicYearId: string,
    dayOfWeek: DayOfWeek,
    periodNumber: number,
    excludeSlotId: string
  ): Promise<TimetableSlot | null> {
    return prisma.timetableSlot.findFirst({
      where: { classId, academicYearId, dayOfWeek, periodNumber, id: { not: excludeSlotId } },
    });
  }

  /**
   * Exchange the (day, period, startTime, endTime) of two slots.
   *
   * The unique constraint on (classId, academicYearId, dayOfWeek, periodNumber)
   * means two parallel UPDATEs can't swap positions directly when both slots
   * share a classId — Postgres checks the constraint per-statement. This uses
   * a 3-step interim move (via a sentinel period number no real slot uses)
   * inside a single transaction to sidestep that.
   */
  async swapSlots(slotId: string, targetSlotId: string): Promise<void> {
    const slot = await this.findById(slotId);
    if (!slot) throw new Error("Slot not found");
    const target = await this.findById(targetSlotId);
    if (!target) throw new Error("Target slot not found");

    await prisma.$transaction(async (tx) => {
      await tx.timetableSlot.update({ where: { id: slotId }, data: { periodNumber: 99999 } });
      await tx.timetableSlot.update({
        where: { id: targetSlotId },
        data: {
          dayOfWeek: slot.dayOfWeek,
          periodNumber: slot.periodNumber,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      });
      await tx.timetableSlot.update({
        where: { id: slotId },
        data: {
          dayOfWeek: target.dayOfWeek,
          periodNumber: target.periodNumber,
          startTime: target.startTime,
          endTime: target.endTime,
        },
      });
    });
  }

  /**
   * Move a single slot to an empty (day, period) cell.
   */
  async moveSlot(
    slotId: string,
    targetDay: DayOfWeek,
    targetPeriod: number,
    targetStartTime?: string,
    targetEndTime?: string
  ): Promise<void> {
    await prisma.timetableSlot.update({
      where: { id: slotId },
      data: {
        dayOfWeek: targetDay,
        periodNumber: targetPeriod,
        ...(targetStartTime && { startTime: targetStartTime }),
        ...(targetEndTime && { endTime: targetEndTime }),
      },
    });
  }
}

// Singleton instance
export const timetableSlotRepository = new TimetableSlotRepository();
