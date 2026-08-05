import { notificationRepository } from "./notification.repository";
import { NotificationStatus, NotificationType, NotificationPriority } from "@/types/prisma-enums";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/http/errors";
import { AuthContext } from "@/lib/auth/authorization";

export interface NotificationFilters {
  status?: NotificationStatus;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface CreateNotificationInput {
  recipientId?: string;
  recipientIds?: string[];
  subject: string;
  message: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/**
 * Notification Service - Business Logic Layer
 *
 * Notifications are always scoped to the logged-in recipient — every read,
 * update, and delete is implicitly "my notifications only," enforced via
 * ownership checks rather than role checks.
 */
export class NotificationService {
  async listNotifications(
    filters: NotificationFilters,
    pagination: PaginationParams,
    context: AuthContext
  ) {
    const { notifications, total } = await notificationRepository.findManyForRecipient(
      context.userId,
      filters,
      pagination
    );

    return {
      notifications,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
    };
  }

  async getUnreadCount(context: AuthContext): Promise<number> {
    return notificationRepository.countUnread(context.userId);
  }

  async createNotification(input: CreateNotificationInput, context: AuthContext) {
    if (!input.subject || !input.message) {
      throw new ValidationError("Subject and message are required");
    }

    const recipients = input.recipientIds?.length
      ? input.recipientIds
      : input.recipientId
      ? [input.recipientId]
      : [];

    if (recipients.length === 0) {
      throw new ValidationError("At least one recipient is required");
    }

    const notifications = await notificationRepository.createMany(
      recipients.map((recipientId) => ({
        sender: { connect: { id: context.userId } },
        recipient: { connect: { id: recipientId } },
        subject: input.subject,
        message: input.message,
        type: input.type ?? "GENERAL",
        priority: input.priority ?? "NORMAL",
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        status: "UNREAD",
      }))
    );

    return { notifications, count: notifications.length };
  }

  private async findOwnedOrThrow(id: string, context: AuthContext) {
    const notification = await notificationRepository.findById(id);

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    if (notification.recipientId !== context.userId) {
      throw new ForbiddenError("You do not have permission to access this notification");
    }

    return notification;
  }

  async updateNotificationStatus(
    id: string,
    status: NotificationStatus,
    context: AuthContext
  ) {
    await this.findOwnedOrThrow(id, context);
    return notificationRepository.updateStatus(id, status);
  }

  async deleteNotification(id: string, context: AuthContext): Promise<void> {
    await this.findOwnedOrThrow(id, context);
    await notificationRepository.delete(id);
  }
}

export const notificationService = new NotificationService();
