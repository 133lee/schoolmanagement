"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { User } from "lucide-react";
import { BottomNav } from "./bottom-nav";
import { MobileDrawer } from "./mobile-drawer";
import { NotificationBell } from "@/components/teacher/notification-bell";
import { NotificationsDrawer } from "@/components/teacher/notifications-drawer";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col h-dvh overflow-hidden bg-background">
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
      />

      {/* ── Sticky top app bar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
        <h1 className="text-base font-semibold">{getPageTitle(pathname)}</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
            <Link href="/teacher/profile">
              <User className="h-[18px] w-[18px]" />
              <span className="sr-only">My Profile</span>
            </Link>
          </Button>
          <NotificationBell
            ref={notificationBellRef}
            onBellClick={() => setNotificationsOpen(true)}
          />
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      {/* pb-28 clears the floating bottom nav (h-16 pill + its own bottom
          offset + breathing room) so the last bit of content never sits
          underneath it, unreachable. */}
      <main
        key={pathname}
        className="flex-1 overflow-y-auto pb-28 animate-in fade-in slide-in-from-right-4 duration-250"
      >
        {children}
      </main>

      <BottomNav
        onMenuOpen={() => setDrawerOpen(true)}
        menuOpen={drawerOpen}
      />

      {/* ── Notifications drawer ─────────────────────────────────────────────── */}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNotificationUpdate={() => notificationBellRef.current?.refreshCount()}
      />
    </div>
  );
}
