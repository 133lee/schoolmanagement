import { describe, it, expect, beforeEach } from "vitest";
import { Role } from "@prisma/client";
import { GET as listNotifications, POST as createNotification } from "@/app/api/notifications/route";
import {
  PATCH as updateNotification,
  DELETE as deleteNotification,
} from "@/app/api/notifications/[id]/route";
import { GET as getUnreadCount } from "@/app/api/notifications/unread-count/route";
import { callRoute } from "../helpers/callRoute";
import { loginAs } from "../helpers/auth";
import { resetDb, createTestUser } from "../helpers/db";

describe("notifications routes", () => {
  let senderToken: string;
  let recipientToken: string;
  let recipientId: string;
  let outsiderToken: string;

  beforeEach(async () => {
    await resetDb();
    const sender = await createTestUser({ role: Role.HEAD_TEACHER });
    senderToken = await loginAs(sender.user.email, sender.password);
    const recipient = await createTestUser({ role: Role.TEACHER });
    recipientToken = await loginAs(recipient.user.email, recipient.password);
    recipientId = recipient.user.id;
    const outsider = await createTestUser({ role: Role.TEACHER });
    outsiderToken = await loginAs(outsider.user.email, outsider.password);
  });

  it("sends a notification, the recipient can list/read/update it, an outsider cannot", async () => {
    const created = await callRoute<{ data: { count: number } }>(createNotification, {
      method: "POST",
      url: "/api/notifications",
      token: senderToken,
      body: { recipientId, subject: "Reminder", message: "Submit your marks by Friday" },
    });
    expect(created.status).toBe(201);
    expect(created.json.data.count).toBe(1);

    const list = await callRoute<{ data: { notifications: { id: string; subject: string }[] } }>(
      listNotifications,
      { url: "/api/notifications", token: recipientToken }
    );
    expect(list.status).toBe(200);
    expect(list.json.data.notifications.map((n) => n.subject)).toContain("Reminder");
    const notificationId = list.json.data.notifications[0].id;

    const outsiderList = await callRoute<{ data: { notifications: unknown[] } }>(listNotifications, {
      url: "/api/notifications",
      token: outsiderToken,
    });
    expect(outsiderList.json.data.notifications).toHaveLength(0);

    const deniedUpdate = await callRoute(updateNotification, {
      method: "PATCH",
      url: `/api/notifications/${notificationId}`,
      token: outsiderToken,
      params: { id: notificationId },
      body: { status: "READ" },
    });
    expect(deniedUpdate.status).toBe(403);

    const updated = await callRoute<{ data: { status: string } }>(updateNotification, {
      method: "PATCH",
      url: `/api/notifications/${notificationId}`,
      token: recipientToken,
      params: { id: notificationId },
      body: { status: "READ" },
    });
    expect(updated.status).toBe(200);
    expect(updated.json.data.status).toBe("READ");

    const deniedDelete = await callRoute(deleteNotification, {
      method: "DELETE",
      url: `/api/notifications/${notificationId}`,
      token: outsiderToken,
      params: { id: notificationId },
    });
    expect(deniedDelete.status).toBe(403);

    const deleted = await callRoute(deleteNotification, {
      method: "DELETE",
      url: `/api/notifications/${notificationId}`,
      token: recipientToken,
      params: { id: notificationId },
    });
    expect(deleted.status).toBe(200);
  });

  it("rejects a notification with no recipient or missing subject/message", async () => {
    const noRecipient = await callRoute(createNotification, {
      method: "POST",
      url: "/api/notifications",
      token: senderToken,
      body: { subject: "X", message: "Y" },
    });
    expect(noRecipient.status).toBe(422);

    const noSubject = await callRoute(createNotification, {
      method: "POST",
      url: "/api/notifications",
      token: senderToken,
      body: { recipientId, message: "Y" },
    });
    expect(noSubject.status).toBe(422);
  });

  it("GET /api/notifications/unread-count reflects only the caller's own unread notifications", async () => {
    await callRoute(createNotification, {
      method: "POST",
      url: "/api/notifications",
      token: senderToken,
      body: { recipientId, subject: "One", message: "First" },
    });
    await callRoute(createNotification, {
      method: "POST",
      url: "/api/notifications",
      token: senderToken,
      body: { recipientId, subject: "Two", message: "Second" },
    });

    const { status, json } = await callRoute<{ data: { count: number } }>(getUnreadCount, {
      url: "/api/notifications/unread-count",
      token: recipientToken,
    });
    expect(status).toBe(200);
    expect(json.data.count).toBe(2);

    const outsiderCount = await callRoute<{ data: { count: number } }>(getUnreadCount, {
      url: "/api/notifications/unread-count",
      token: outsiderToken,
    });
    expect(outsiderCount.json.data.count).toBe(0);
  });
});
