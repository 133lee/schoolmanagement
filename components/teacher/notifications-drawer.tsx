"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Clock,
  AlertTriangle,
  Info,
  MessageSquare,
  CalendarClock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  subject: string;
  message: string;
  type: string;
  priority: string;
  status: string;
  createdAt: string;
  readAt?: string;
  sender: {
    id: string;
    email: string;
    role: string;
    profile: { firstName: string; lastName: string } | null;
  };
}

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationUpdate?: () => void;
}

function typeConfig(type: string): {
  icon: React.ReactNode;
  bg: string;
  text: string;
} {
  switch (type) {
    case "ASSESSMENT_REMINDER":
      return {
        icon: <Clock className="h-3.5 w-3.5" />,
        bg: "bg-blue-100 dark:bg-blue-900/40",
        text: "text-blue-600 dark:text-blue-400",
      };
    case "DEADLINE_EXTENSION":
      return {
        icon: <CalendarClock className="h-3.5 w-3.5" />,
        bg: "bg-amber-100 dark:bg-amber-900/40",
        text: "text-amber-600 dark:text-amber-400",
      };
    case "APPROVAL_REQUEST":
      return {
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        bg: "bg-orange-100 dark:bg-orange-900/40",
        text: "text-orange-600 dark:text-orange-400",
      };
    case "GENERAL":
    default:
      return {
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        bg: "bg-muted",
        text: "text-muted-foreground",
      };
  }
}

function priorityDot(priority: string) {
  if (priority === "URGENT" || priority === "HIGH")
    return "bg-red-500";
  if (priority === "NORMAL")
    return "bg-blue-500";
  return "bg-muted-foreground/40";
}

function getSenderName(sender: Notification["sender"]) {
  if (sender.profile)
    return `${sender.profile.firstName} ${sender.profile.lastName}`;
  return sender.email;
}

function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isUnread = notification.status === "UNREAD";
  const config = typeConfig(notification.type);
  const isLong = notification.message.length > 120;

  return (
    <div
      className={cn(
        "group relative rounded-xl border transition-all",
        isUnread
          ? "bg-card border-border shadow-sm"
          : "bg-muted/30 border-transparent"
      )}
    >
      {/* Unread accent bar */}
      {isUnread && (
        <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-primary" />
      )}

      <div className="px-4 py-3 pl-5">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", config.bg, config.text)}>
            {config.icon}
          </div>

          <div className="min-w-0 flex-1">
            {/* Subject + time */}
            <div className="flex items-start justify-between gap-2">
              <p className={cn("text-sm leading-snug", isUnread ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
                {notification.subject}
              </p>
              <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </span>
            </div>

            {/* Sender + priority */}
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", priorityDot(notification.priority))} />
              <span className="text-xs text-muted-foreground truncate">
                {getSenderName(notification.sender)}
              </span>
            </div>

            {/* Message */}
            <p className={cn("mt-1.5 text-sm text-muted-foreground leading-relaxed", !expanded && isLong && "line-clamp-2")}>
              {notification.message}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-0.5 flex items-center gap-0.5 text-[11px] text-primary hover:underline"
              >
                {expanded ? (
                  <><ChevronUp className="h-3 w-3" />Show less</>
                ) : (
                  <><ChevronDown className="h-3 w-3" />Show more</>
                )}
              </button>
            )}

            {/* Actions — visible on hover or when unread */}
            <div className={cn("mt-2 flex items-center gap-1 transition-opacity", !isUnread && "opacity-0 group-hover:opacity-100")}>
              {isUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onMarkRead(notification.id)}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(notification.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationsDrawer({
  isOpen,
  onClose,
  onNotificationUpdate,
}: NotificationsDrawerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"unread" | "all">("unread");
  const { toast } = useToast();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const params = new URLSearchParams({ limit: "50" });
      if (filter === "unread") params.append("status", "UNREAD");

      const res = await fetch(`/api/notifications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();

      const result = await res.json();
      if (result.success) setNotifications(result.data.notifications);
    } catch {
      toast({ title: "Failed to load notifications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, filter]);

  const handleMarkRead = async (id: string) => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "READ" }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "READ", readAt: new Date().toISOString() } : n))
    );
    onNotificationUpdate?.();
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const ids = notifications.filter((n) => n.status === "UNREAD").map((n) => n.id);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/notifications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: "READ" }),
        })
      )
    );
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "READ", readAt: new Date().toISOString() })));
    onNotificationUpdate?.();
    toast({ title: "All notifications marked as read" });
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    await fetch(`/api/notifications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    onNotificationUpdate?.();
  };

  const unreadCount = notifications.filter((n) => n.status === "UNREAD").length;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[420px]">
        {/* Header */}
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={fetchNotifications}
                disabled={loading}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-xs"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  All read
                </Button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="mt-3 flex gap-1 rounded-lg bg-muted p-1">
            {(["unread", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all",
                  filter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f === "unread" ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` : "All"}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="px-4 py-3">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <BellOff className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="mt-4 font-medium text-foreground">
                  {filter === "unread" ? "You're all caught up" : "No notifications"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {filter === "unread"
                    ? "New messages from your HOD will appear here"
                    : "Notifications will appear here"}
                </p>
                {filter === "unread" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 text-xs"
                    onClick={() => setFilter("all")}
                  >
                    View all notifications
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <NotificationCard
                    key={n.id}
                    notification={n}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
