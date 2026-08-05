"use client";

import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  onBellClick?: () => void;
}

export interface NotificationBellRef {
  refreshCount: () => void;
}

export const NotificationBell = forwardRef<NotificationBellRef, NotificationBellProps>(
  ({ onBellClick }, ref) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [shake, setShake] = useState(false);
    const prevCountRef = useRef(0);

    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const response = await fetch("/api/notifications/unread-count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;

        const result = await response.json();
        if (result.success) {
          const newCount: number = result.data.count;
          if (newCount > prevCountRef.current) {
            setShake(true);
            setTimeout(() => setShake(false), 700);
          }
          prevCountRef.current = newCount;
          setUnreadCount(newCount);
        }
      } catch {
        // silent — polling failure shouldn't surface as a toast
      }
    };

    useImperativeHandle(ref, () => ({ refreshCount: fetchUnreadCount }));

    useEffect(() => {
      fetchUnreadCount();

      // Poll every 15 seconds
      const interval = setInterval(fetchUnreadCount, 15000);

      // Re-poll immediately when the tab comes back into focus
      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") fetchUnreadCount();
      };
      document.addEventListener("visibilitychange", onVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };
    }, []);

    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("relative h-9 w-9 rounded-full", shake && "animate-bell-shake")}
        onClick={onBellClick}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </Button>
    );
  }
);

NotificationBell.displayName = "NotificationBell";
