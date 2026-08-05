"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/dashboard/teacher-sidebar";
import { NotificationBell } from "@/components/teacher/notification-bell";
import { NotificationsDrawer } from "@/components/teacher/notifications-drawer";
import { MobileTeacherLayout } from "@/components/mobile/teacher/layout/mobile-teacher-layout";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState, useRef }from "react";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const handleNotificationClick = () => {
    setIsNotificationsOpen(true);
  };

  const handleNotificationUpdate = () => {
    // Refresh the notification bell count when notifications are updated
    if (notificationBellRef.current) {
      notificationBellRef.current.refreshCount();
    }
  };

  // ── Mobile layout ───────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <MobileTeacherLayout
          user={
            user
              ? {
                  name: user.profile
                    ? `${user.profile.firstName} ${user.profile.lastName}`
                    : user.name ?? user.email,
                  email: user.email,
                  role: user.role,
                }
              : undefined
          }
        >
          {children}
        </MobileTeacherLayout>
        <OfflineBanner />
      </>
    );
  }

  // ── Desktop layout (unchanged) ───────────────────────────────────────────────
  return (
    <SidebarProvider>
      <TeacherSidebar user={user} />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          {/* Header with Notification Bell */}
          <header className="sticky top-0 z-10 flex h-14 items-center justify-end gap-4 border-b bg-background px-6">
            <NotificationBell
              ref={notificationBellRef}
              onBellClick={handleNotificationClick}
            />
          </header>

          {/* Main Content */}
          <div className="flex flex-1 flex-col items-center justify-start p-4">
            <div className="w-full max-w-350">{children}</div>
          </div>
        </div>
      </SidebarInset>

      {/* Notifications Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNotificationUpdate={handleNotificationUpdate}
      />

      <OfflineBanner />
    </SidebarProvider>
  );
}
