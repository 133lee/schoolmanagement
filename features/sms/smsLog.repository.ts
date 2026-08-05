import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { SMSStatus, SMSProvider } from "@/types/prisma-enums";
import type { SMSLog } from "@prisma/client";

/**
 * SMSLog Repository - Data Access Layer
 *
 * Manages SMS message logs for tracking sent messages.
 * No business logic - pure data access.
 */
export class SMSLogRepository {
  /**
   * Create a new SMS log entry
   */
  async create(data: Prisma.SMSLogCreateInput): Promise<SMSLog> {
    try {
      return await prisma.sMSLog.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new Error("Referenced guardian or student not found");
        }
      }
      throw error;
    }
  }

  /**
   * Create SMS log within transaction
   */
  async createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.SMSLogCreateInput
  ): Promise<SMSLog> {
    return tx.sMSLog.create({ data });
  }

  /**
   * Find SMS log by ID
   */
  async findById(id: string): Promise<SMSLog | null> {
    return prisma.sMSLog.findUnique({
      where: { id },
    });
  }

  /**
   * Find SMS log by ID with relations
   */
  async findByIdWithRelations(id: string) {
    return prisma.sMSLog.findUnique({
      where: { id },
      include: {
        guardian: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentNumber: true,
          },
        },
      },
    });
  }

  /**
   * Find all SMS logs
   */
  async findAll(): Promise<SMSLog[]> {
    return prisma.sMSLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  /**
   * Find SMS logs by guardian
   */
  async findByGuardian(guardianId: string): Promise<SMSLog[]> {
    return prisma.sMSLog.findMany({
      where: { guardianId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find SMS logs by student
   */
  async findByStudent(studentId: string): Promise<SMSLog[]> {
    return prisma.sMSLog.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find SMS logs by status
   */
  async findByStatus(status: SMSStatus): Promise<SMSLog[]> {
    return prisma.sMSLog.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find SMS logs by provider
   */
  async findByProvider(provider: SMSProvider): Promise<SMSLog[]> {
    return prisma.sMSLog.findMany({
      where: { provider },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find SMS logs by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<SMSLog[]> {
    return prisma.sMSLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find SMS logs by sender
   */
  async findBySentBy(sentBy: string): Promise<SMSLog[]> {
    return prisma.sMSLog.findMany({
      where: { sentBy },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find many with filters and pagination
   */
  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.SMSLogWhereInput;
    orderBy?: Prisma.SMSLogOrderByWithRelationInput;
    include?: Prisma.SMSLogInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = params;

    return prisma.sMSLog.findMany({
      skip,
      take: Math.min(take, 100),
      where,
      orderBy: orderBy || { createdAt: "desc" },
      include: include || {
        guardian: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentNumber: true,
          },
        },
      },
    });
  }

  /**
   * Count SMS logs
   */
  async count(where?: Prisma.SMSLogWhereInput): Promise<number> {
    return prisma.sMSLog.count({ where });
  }

  /**
   * Update SMS log
   */
  async update(id: string, data: Prisma.SMSLogUpdateInput): Promise<SMSLog> {
    try {
      return await prisma.sMSLog.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("SMS log not found");
        }
      }
      throw error;
    }
  }

  /**
   * Update SMS status
   */
  async updateStatus(
    id: string,
    status: SMSStatus,
    error?: string
  ): Promise<SMSLog> {
    const updateData: Prisma.SMSLogUpdateInput = {
      status,
      sentAt: status === "SENT" || status === "DELIVERED" ? new Date() : undefined,
      error: error || undefined,
    };

    return this.update(id, updateData);
  }

  /**
   * Delete SMS log
   */
  async delete(id: string): Promise<SMSLog> {
    try {
      return await prisma.sMSLog.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new Error("SMS log not found");
        }
      }
      throw error;
    }
  }

  /**
   * Get SMS statistics
   */
  async getStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
    provider?: SMSProvider;
  }) {
    const where: Prisma.SMSLogWhereInput = {};

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters?.provider) {
      where.provider = filters.provider;
    }

    const [total, sent, delivered, failed, pending, totalCost] = await Promise.all([
      prisma.sMSLog.count({ where }),
      prisma.sMSLog.count({ where: { ...where, status: "SENT" } }),
      prisma.sMSLog.count({ where: { ...where, status: "DELIVERED" } }),
      prisma.sMSLog.count({ where: { ...where, status: "FAILED" } }),
      prisma.sMSLog.count({ where: { ...where, status: "PENDING" } }),
      prisma.sMSLog.aggregate({
        where,
        _sum: {
          cost: true,
        },
      }),
    ]);

    return {
      total,
      sent,
      delivered,
      failed,
      pending,
      successRate: total > 0 ? ((sent + delivered) / total) * 100 : 0,
      totalCost: totalCost._sum.cost || 0,
    };
  }

  /**
   * Bulk create SMS logs
   */
  async bulkCreate(
    data: Prisma.SMSLogCreateManyInput[]
  ): Promise<Prisma.BatchPayload> {
    return prisma.sMSLog.createMany({
      data,
      skipDuplicates: false,
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
}

// Singleton instance
export const smsLogRepository = new SMSLogRepository();
