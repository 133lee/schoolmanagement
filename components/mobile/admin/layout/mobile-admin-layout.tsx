"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AdminBottomNav } from "./bottom-nav";
import { MobileAdminDrawer } from "./mobile-drawer";
import { NotificationBell } from "@/components/teacher/notification-bell";
import { NotificationsDrawer } from "@/components/teacher/notifications-drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MobileHeaderRefreshProvider, useMobileHeaderRefreshState } from "@/hooks/useMobileHeaderRefresh";

// ── Page title map ─────────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  "/admin":                         "Dashboard",
  "/admin/students":                "Students",
  "/admin/teachers":                "Teachers",
  "/admin/classes":                 "Classes",
  "/admin/departments":             "Departments",
  "/admin/subjects":                "Subjects",
  "/admin/parents":                 "Parents",
  "/admin/timetable":               "Timetable",
  "/admin/assessments":             "Assessments",
  "/admin/attendance":              "Attendance",
  "/admin/attendance/analytics":    "Attendance Analytics",
  "/admin/attendance/reports":      "Attendance Reports",
  "/admin/reports":                 "Reports",
  "/admin/reports/subject-analysis":"Subject Analysis",
  "/admin/report-cards":            "Report Cards",
  "/admin/settings":                "Settings",
  "/admin/profile":                 "My Profile",
  "/admin/terms":                   "Terms",
  "/admin/rooms":                   "Rooms",
  "/admin/academic-years":          "Academic Years",
  "/admin/school-statistics":       "School Statistics",
  "/admin/permissions":             "Permissions",
  "/admin/assessment-calendar":     "Assessment Calendar",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Try matching on first three segments (e.g. /admin/students/[id])
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const key2 = `/${parts[0]}/${parts[1]}`;
    if (PAGE_TITLES[key2]) return PAGE_TITLES[key2];
  }
  if (parts.length >= 3) {
    const key3 = `/${parts[0]}/${parts[1]}/${parts[2]}`;
    if (PAGE_TITLES[key3]) return PAGE_TITLES[key3];
  }
  const last = parts.pop() ?? "Dashboard";
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface MobileAdminLayoutProps {
  children: React.ReactNode;
  user?: { name: string; email: string; role: string };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MobileAdminLayout(props: MobileAdminLayoutProps) {
  return (
    <MobileHeaderRefreshProvider>
      <MobileAdminLayoutChrome {...props} />
    </MobileHeaderRefreshProvider>
  );
}

function MobileAdminLayoutChrome({ children, user }: MobileAdminLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationBellRef = useRef<{ refreshCount: () => void }>(null);
  const pathname = usePathname();
  const refresh = useMobileHeaderRefreshState();

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-background">
      <MobileAdminDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
      />

      {/* ── Sticky top app bar ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
        <h1 className="text-base font-semibold">{getPageTitle(pathname)}</h1>
        <div className="flex items-center gap-1">
          {refresh.fn && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refresh.fn?.()}
              disabled={refresh.loading}
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", refresh.loading && "animate-spin")} />
            </Button>
          )}
          <NotificationBell
            ref={notificationBellRef}
            onBellClick={() => setNotificationsOpen(true)}
          />
        </div>
      </header>

      {/* ── Page content ────────────────────────────────────────────────────── */}
      <main
        key={pathname}
        className="flex-1 overflow-y-auto pb-28 animate-in fade-in slide-in-from-right-4 duration-250"
      >
        {children}
      </main>

      <AdminBottomNav onMenuOpen={() => setDrawerOpen(true)} menuOpen={drawerOpen} />

      {/* ── Notifications drawer ─────────────────────────────────────────────── */}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNotificationUpdate={() => notificationBellRef.current?.refreshCount()}
      />
    </div>
  );
}
