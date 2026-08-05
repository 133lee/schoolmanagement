"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "./bottom-nav";
import { MobileDrawer } from "./mobile-drawer";
import { NotificationBell } from "@/components/teacher/notification-bell";
import { NotificationsDrawer } from "@/components/teacher/notifications-drawer";

// ── Page title map ─────────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  "/teacher":               "Dashboard",
  "/teacher/classes":       "Classes",
  "/teacher/timetable":     "Timetable",
  "/teacher/assessments":   "Assessments",
  "/teacher/students":      "Performance",
  "/teacher/attendance":    "Attendance",
  "/teacher/lesson-plans":  "Lesson Plans",
  "/teacher/analysis":      "Analysis",
  "/teacher/reports":       "Reports",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Match on first two segments e.g. /teacher/assessments/[id]/enter-results → "Assessments"
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const key = `/${parts[0]}/${parts[1]}`;
    if (PAGE_TITLES[key]) return PAGE_TITLES[key];
  }
  // Fallback: capitalise and humanise the last segment
  const last = parts.pop() ?? "Dashboard";
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface MobileTeacherLayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MobileTeacherLayout({
  children,
  user,
}: MobileTeacherLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationBellRef = useRef<{ refreshCount: () => void }>(null);
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
      />

      {/* ── Sticky top app bar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
        <h1 className="text-base font-semibold">{getPageTitle(pathname)}</h1>
        <NotificationBell
          ref={notificationBellRef}
          onBellClick={() => setNotificationsOpen(true)}
        />
      </header>

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <main
        key={pathname}
        className="flex-1 overflow-y-auto pb-16 animate-in fade-in slide-in-from-right-4 duration-250"
      >
        {children}
      </main>

      <BottomNav onMenuOpen={() => setDrawerOpen(true)} />

      {/* ── Notifications drawer ─────────────────────────────────────────────── */}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNotificationUpdate={() => notificationBellRef.current?.refreshCount()}
      />
    </div>
  );
}
