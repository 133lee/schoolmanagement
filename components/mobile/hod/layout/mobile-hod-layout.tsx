"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { User, RefreshCw, Download } from "lucide-react";
import { HodBottomNav } from "./bottom-nav";
import { MobileHodDrawer } from "./mobile-drawer";
import { NotificationBell } from "@/components/teacher/notification-bell";
import { NotificationsDrawer } from "@/components/teacher/notifications-drawer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MobileHeaderRefreshProvider, useMobileHeaderRefreshState } from "@/hooks/useMobileHeaderRefresh";
import { MobileHeaderExportProvider, useMobileHeaderExportState } from "@/hooks/useMobileHeaderExport";

// ── Page title map ─────────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  "/hod":             "Dashboard",
  "/hod/assessments": "Assessments",
  "/hod/classes":     "Classes",
  "/hod/reports":     "Reports",
  "/hod/teachers":    "Teachers",
  "/hod/students":    "Students",
  "/hod/subjects":    "Subjects",
  "/hod/assignments": "Assignments",
  "/hod/profile":     "My Profile",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const key = `/${parts[0]}/${parts[1]}`;
    if (PAGE_TITLES[key]) return PAGE_TITLES[key];
  }
  const last = parts.pop() ?? "Dashboard";
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface MobileHodLayoutProps {
  children: React.ReactNode;
  user?: { name: string; email: string; role: string };
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MobileHodLayout(props: MobileHodLayoutProps) {
  return (
    <MobileHeaderRefreshProvider>
      <MobileHeaderExportProvider>
        <MobileHodLayoutChrome {...props} />
      </MobileHeaderExportProvider>
    </MobileHeaderRefreshProvider>
  );
}

function MobileHodLayoutChrome({ children, user }: MobileHodLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationBellRef = useRef<{ refreshCount: () => void }>(null);
  const pathname = usePathname();
  const refresh = useMobileHeaderRefreshState();
  const exportHandlers = useMobileHeaderExportState();

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-background">
      <MobileHodDrawer
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
          {exportHandlers.onExportPdf && exportHandlers.onExportExcel && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Export">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportHandlers.onExportPdf?.()}>
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportHandlers.onExportExcel?.()}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild>
            <Link href="/hod/profile">
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

      {/* ── Page content ────────────────────────────────────────────────────── */}
      <main
        key={pathname}
        className="flex-1 overflow-y-auto pb-28 animate-in fade-in slide-in-from-right-4 duration-250"
      >
        {children}
      </main>

      <HodBottomNav onMenuOpen={() => setDrawerOpen(true)} menuOpen={drawerOpen} />

      {/* ── Notifications drawer ─────────────────────────────────────────────── */}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onNotificationUpdate={() => notificationBellRef.current?.refreshCount()}
      />
    </div>
  );
}
