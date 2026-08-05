import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { Room, RoomType, DayOfWeek } from "@/types/prisma-enums";

/**
 * Room Repository - Data Access Layer
 *
 * Manages school rooms/classrooms.
 * No business logic - pure data access.
 */
export class RoomRepository {
  /**
   * Create a new room
   */
  async create(data: Prisma.RoomCreateInput): Promise<Room> {
    try {
      return await prisma.room.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new Error("A room with this name or code already exists");
        }
      }
      throw error;
    }
  }

  /**
   * Create room within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.RoomCreateInput
  ): Promise<Room> {
    return tx.room.create({ data });
  }

  /**
   * Find room by ID
   */
  async findById(id: string): Promise<Room | null> {
    return prisma.room.findUnique({
      where: { id },
    });
  }

  /**
   * Find room by ID with relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.room.findUnique({
      where: { id },
      include: {
        timetableSlots: {
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
              },
            },
          },
        },
        _count: {
          select: {
            timetableSlots: true,
          },
        },
      },
    });
  }

  /**
   * Find room by name
   */
  async findByName(name: string): Promise<Room | null> {
    return prisma.room.findUnique({
      where: { name },
    });
  }

  /**
   * Find room by code
   */
  async findByCode(code: string): Promise<Room | null> {
    return prisma.room.findUnique({
      where: { code },
    });
  }

  /**
   * Find all rooms
   */
  async findAll(): Promise<Room[]> {
    return prisma.room.findMany({
      orderBy: [
        { type: "asc" },
        { name: "asc" },
      ],
    });
  }

  /**
   * Find active rooms
   */
  async findActive(): Promise<Room[]> {
    return prisma.room.findMany({
      where: { isActive: true },
      orderBy: [
        { type: "asc" },
        { name: "asc" },
      ],
    });
  }

  /**
   * Find rooms by type
   */
  async findByType(type: RoomType): Promise<Room[]> {
    return prisma.room.findMany({
      where: { type },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Find rooms by building
   */
  async findByBuilding(building: string): Promise<Room[]> {
    return prisma.room.findMany({
      where: { building },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Find many with filters
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.RoomWhereInput;
    orderBy?: Prisma.RoomOrderByWithRelationInput;
    include?: Prisma.RoomInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;

    return prisma.room.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || [
        { type: "asc" },
        { name: "asc" },
      ],
      include,
    });
  }

  /**
   * Count rooms
   */
  async count(where?: Prisma.RoomWhereInput): Promise<number> {
    return prisma.room.count({ where });
  }

  /**
   * Update room
   */
  async update(id: string, data: Prisma.RoomUpdateInput): Promise<Room> {
    try {
      return await prisma.room.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Room not found");
        }
        if (error.code === "P2002") {
          throw new Error("A room with this name or code already exists");
        }
      }
      throw error;
    }
  }

  /**
   * Delete room
   */
  async delete(id: string): Promise<Room> {
    try {
      return await prisma.room.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("Room not found");
        }
        if (error.code === "P2003") {
          throw new Error("Cannot delete room with existing timetable slots");
        }
      }
      throw error;
    }
  }

  /**
   * Check if room has timetable slots
   */
  async hasTimeTableSlots(roomId: string): Promise<boolean> {
    const count = await prisma.timetableSlot.count({
      where: { roomId },
    });
    return count > 0;
  }

  /**
   * Get available rooms for a specific time slot
   */
  async findAvailableRooms(
    dayOfWeek: DayOfWeek,
    periodNumber: number,
    academicYearId: string
  ): Promise<Room[]> {
    // Get all rooms that are active
    const allRooms = await this.findActive();

    // Get rooms that are occupied at this time
    const occupiedRooms = await prisma.timetableSlot.findMany({
      where: {
        dayOfWeek,
        periodNumber,
        academicYearId,
        roomId: { not: null },
      },
      select: { roomId: true },
    });

    const occupiedRoomIds = new Set(
      occupiedRooms.map((slot) => slot.roomId).filter(Boolean)
    );

    // Filter out occupied rooms
    return allRooms.filter((room) => !occupiedRoomIds.has(room.id));
  }

  /**
   * Transaction wrapper
   */
  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(fn);
  }
}

// Singleton instance
export const roomRepository = new RoomRepository();
