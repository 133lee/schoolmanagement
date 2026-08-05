"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarComponent } from "@/components/dashboard/app-sidebar";
import { MobileAdminLayout } from "@/components/mobile/admin/layout/mobile-admin-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { isAdminRole } from "@/lib/auth/role-routes";
import { Role } from "@/types/prisma-enums";

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Admin Layout
 * Protects all admin routes and provides mobile / desktop chrome.
 * Roles allowed: ADMIN, HEAD_TEACHER, CLERK
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  const router    = useRouter();
  const isMobile  = useIsMobile();
  const [user, setUser]               = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) { router.push("/login"); return; }

    try {
      const parsed = JSON.parse(userData);
      if (!isAdminRole(parsed.role as Role)) {
        router.push("/login");
        return;
      }
      setUser(parsed);
      setIsAuthorized(true);
    } catch (error) {
      console.error("Error validating admin access:", error);
      router.push("/login");
    }
  }, [router]);

  // Show loading until auth check completes (and isMobile resolves)
  if (!isAuthorized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const resolvedUser = user
    ? {
        name:  user.profile
                 ? `${user.profile.firstName} ${user.profile.lastName}`
                 : user.name ?? user.email,
        email: user.email,
        role:  user.role,
      }
    : undefined;

  // ── Mobile layout ────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <MobileAdminLayout user={resolvedUser}>
        {children}
      </MobileAdminLayout>
    );
  }

  // ── Desktop layout ───────────────────────────────────────────────────────────
  return (
    <SidebarProvider>
      <SidebarComponent user={user} />
      <SidebarInset>
        <div className="flex flex-1 flex-col items-center justify-start p-4">
          <div className="w-full max-w-350">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
