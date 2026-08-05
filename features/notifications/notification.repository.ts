import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { Notification, NotificationStatus } from "@/types/prisma-enums";

const recipientInclude = {
  sender: {
    select: {
      id: true,
      email: true,
      role: true,
      profile: {
        select: { firstName: true, lastName: true },
      },
    },
  },
} as const;

/**
 * Notification Repository - Data Access Layer
 */
export class NotificationRepository {
  async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({ where: { id } });
  }

  async findManyForRecipient(
    recipientId: string,
    filters: { status?: NotificationStatus },
    pagination: { limit: number; offset: number }
  ) {
    const where: Prisma.NotificationWhereInput = { recipientId };
    if (filters.status) {
      where.status = filters.status;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: pagination.limit,
        skip: pagination.offset,
        include: recipientInclude,
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  async countUnread(recipientId: string): Promise<number> {
    return prisma.notification.count({
      where: { recipientId, status: "UNREAD" },
    });
  }

  async createMany(
    data: Array<Prisma.NotificationCreateInput>
  ): Promise<Notification[]> {
    return prisma.$transaction(
      data.map((entry) =>
        prisma.notification.create({
          data: entry,
          include: {
            recipient: {
              select: {
                email: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        })
      )
    );
  }

  async updateStatus(id: string, status: NotificationStatus): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: {
        status,
        readAt: status === "READ" ? new Date() : undefined,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.notification.delete({ where: { id } });
  }
}

export const notificationRepository = new NotificationRepository();
