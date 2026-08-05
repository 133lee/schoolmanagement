"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, User, LogOut, Webhook, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const drawerNavItems = [
  { title: "Dashboard", href: "/teacher", icon: Home, exact: true },
  { title: "Reports", href: "/teacher/reports", icon: BarChart3 },
  { title: "My Profile", href: "/teacher/profile", icon: User },
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
  const { logout } = useAuth();

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
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Webhook className="size-4" />
              </div>
              <SheetTitle className="text-sm font-semibold leading-tight">
                Teacher Portal
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        {/* User info */}
        <div className="flex items-center gap-3 px-4 py-4">
          <Avatar className="size-10">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">
              {user?.name ?? "Teacher"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.email ?? ""}
            </span>
          </div>
        </div>

        <Separator />

        {/* Nav items */}
        <nav className="flex flex-col gap-1 px-2 py-3 flex-1">
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("size-4", isActive && "stroke-[2.5px]")} />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* Sign out */}
        <div className="p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
