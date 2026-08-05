"use client";

import { useEffect, useState, useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { HodSidebar } from "@/components/dashboard/hod-sidebar";
import { NotificationBell } from "@/components/teacher/notification-bell";
import { NotificationsDrawer } from "@/components/teacher/notifications-drawer";
import { MobileHodLayout } from "@/components/mobile/hod/layout/mobile-hod-layout";
import { useIsMobile } from "@/hooks/use-mobile";

export default function HodLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationBellRef = useRef<{ refreshCount: () => void }>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const resolvedUser = user
    ? {
        name: user.profile
          ? `${user.profile.firstName} ${user.profile.lastName}`
          : user.name ?? user.email,
        email: user.email,
        role:  user.role,
      }
    : undefined;

  // ── Mobile layout ────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <MobileHodLayout user={resolvedUser}>
        {children}
      </MobileHodLayout>
    );
  }

  // ── Desktop layout ───────────────────────────────────────────────────────────
  return (
    <SidebarProvider>
      <HodSidebar user={user} />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-end gap-4 border-b bg-background px-6">
            <NotificationBell
              ref={notificationBellRef}
              onBellClick={() => setIsNotificationsOpen(true)}
            />
          </header>
          <div className="flex flex-1 flex-col items-center justify-start p-4">
            <div className="w-full max-w-350">{children}</div>
          </div>
        </div>
      </SidebarInset>

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNotificationUpdate={() => notificationBellRef.current?.refreshCount()}
      />
    </SidebarProvider>
  );
}
