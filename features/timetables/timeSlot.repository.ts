import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { TimeSlot } from "@/types/prisma-enums";

/**
 * TimeSlot Repository
 *
 * Manages reusable time slots for both primary and secondary timetables.
 * Time slots define periods like "Period 1 (08:00-08:40)", "Break", "Lunch", etc.
 */
export class TimeSlotRepository {
  /**
   * Create a new time slot
   */
  async create(data: Prisma.TimeSlotCreateInput): Promise<TimeSlot> {
    try {
      return await prisma.timeSlot.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("Time slot with this start and end time already exists");
        }
      }
      throw error;
    }
  }

  /**
   * Find all time slots ordered by start time
   */
  async findAll(): Promise<TimeSlot[]> {
    return prisma.timeSlot.findMany({
      orderBy: { startTime: "asc" },
    });
  }

  /**
   * Find time slot by ID
   */
  async findById(id: string): Promise<TimeSlot | null> {
    return prisma.timeSlot.findUnique({
      where: { id },
    });
  }

  /**
   * Find time slot by start and end time
   */
  async findByTime(startTime: string, endTime: string): Promise<TimeSlot | null> {
    return prisma.timeSlot.findUnique({
      where: {
        startTime_endTime: {
          startTime,
          endTime,
        },
      },
    });
  }

  /**
   * Update a time slot
   */
  async update(id: string, data: Prisma.TimeSlotUpdateInput): Promise<TimeSlot> {
    try {
      return await prisma.timeSlot.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Time slot not found");
        }
        if (error.code === "P2002") {
          throw new Error("Time slot with this start and end time already exists");
        }
      }
      throw error;
    }
  }

  /**
   * Delete a time slot
   */
  async delete(id: string): Promise<TimeSlot> {
    try {
      return await prisma.timeSlot.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Time slot not found");
        }
        if (error.code === "P2003") {
          throw new Error("Cannot delete time slot - it is being used in timetables");
        }
      }
      throw error;
    }
  }

  /**
   * Check if time slot is in use
   */
  async isInUse(id: string): Promise<boolean> {
    const [primaryCount, secondaryCount] = await Promise.all([
      prisma.classTimetable.count({ where: { timeSlotId: id } }),
      prisma.secondaryTimetable.count({ where: { timeSlotId: id } }),
    ]);
    return primaryCount > 0 || secondaryCount > 0;
  }

  /**
   * Count time slots
   */
  async count(): Promise<number> {
    return prisma.timeSlot.count();
  }
}

export const timeSlotRepository = new TimeSlotRepository();
