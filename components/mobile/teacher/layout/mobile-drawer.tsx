"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Calendar, BarChart3, LogOut, Webhook, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useHodStatus } from "@/hooks/useHodStatus";

const drawerNavItems = [
  { title: "Dashboard", href: "/teacher", icon: Home, exact: true },
  { title: "Timetable", href: "/teacher/timetable", icon: Calendar },
  { title: "Reports", href: "/teacher/reports", icon: BarChart3 },
];

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export function MobileDrawer({ open, onClose, user }: MobileDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { isHOD, department, isLoading: hodLoading } = useHodStatus();

  const handleSwitchToHOD = () => {
    onClose();
    router.push("/hod");
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "T";

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col gap-0">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-[0_0_16px_-4px_rgba(37,99,235,0.6)]">
              <Webhook className="size-4.5" />
            </div>
            <SheetTitle className="text-sm font-semibold leading-tight">
              Teacher Portal
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* User info */}
        <div className="mx-4 mt-4 mb-1 flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
          <Avatar className="size-11 ring-2 ring-blue-500/25">
            <AvatarFallback className="bg-blue-600 text-white font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate">
              {user?.name ?? "Teacher"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.email ?? ""}
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 px-3 py-3 flex-1">
          {drawerNavItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg shrink-0 transition-colors",
                    isActive ? "bg-blue-600 text-white" : "bg-muted"
                  )}
                >
                  <item.icon className="size-4" />
                </span>
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Switch to HOD — only for teachers who also hold an HOD position */}
        {!hodLoading && isHOD && (
          <div className="px-3 pb-3">
            <button
              onClick={handleSwitchToHOD}
              className="flex w-full items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white shrink-0">
                <Building2 className="size-4" />
              </span>
              <span className="flex flex-col items-start min-w-0 text-left">
                <span className="truncate leading-tight">Switch to HOD</span>
                <span className="text-[11px] font-normal text-blue-600/70 dark:text-blue-400/70 truncate">
                  {department?.code ?? "Department"}
                </span>
              </span>
            </button>
          </div>
        )}

        <Separator />

        {/* Sign out */}
        <div className="p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 shrink-0">
              <LogOut className="size-4" />
            </span>
            Sign out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
