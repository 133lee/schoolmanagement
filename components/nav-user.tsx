"use client";

import { ChevronsUpDown, LogOut, User, Settings, Moon, Sun, Monitor } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import * as React from "react";

interface NavUserProps {
  user: {
    name: string;
    email: string;
    role: string;
    rawRole?: string; // Original role value (e.g., "TEACHER", "ADMIN")
    hasDefaultPassword?: boolean; // Flag to show password change indicator
  };
}

export function NavUser({ user }: NavUserProps) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Get raw role from localStorage
  const getRawRole = () => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.role;
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
    return null;
  };

  const rawRole = user.rawRole || getRawRole();

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("system");
    } else {
      setTheme("dark");
    }
  };

  const getThemeLabel = () => {
    if (theme === "dark") return "Light Mode";
    if (theme === "light") return "System Mode";
    return "Dark Mode";
  };

  const getThemeIcon = () => {
    if (theme === "dark") return <Sun />;
    if (theme === "light") return <Monitor />;
    return <Moon />;
  };

  const getInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  const getProfileRoute = () => {
    // Determine profile route based on role
    if (rawRole === "HOD") return "/hod/profile";
    if (rawRole === "TEACHER") return "/teacher/profile";
    if (rawRole === "ADMIN") return "/admin/profile";
    if (rawRole === "PARENT") return "/parent/profile";
    return "/admin/profile"; // Default fallback
  };

  const getSettingsRoute = () => {
    // Determine settings route based on role
    if (rawRole === "HOD") return "/hod/settings";
    if (rawRole === "TEACHER") return "/teacher/settings";
    if (rawRole === "ADMIN") return "/admin/settings";
    if (rawRole === "PARENT") return "/parent/settings";
    return "/admin/settings"; // Default fallback
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                {user.hasDefaultPassword && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.email}</span>
                <span className="truncate text-xs">{user.role}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="relative">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {user.hasDefaultPassword && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.email}</span>
                  <span className="truncate text-xs">{user.role}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(getProfileRoute())}>
              <div className="relative">
                <User />
                {user.hasDefaultPassword && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                )}
              </div>
              Profile
            </DropdownMenuItem>
            {rawRole === "ADMIN" && (
              <DropdownMenuItem onClick={() => router.push(getSettingsRoute())}>
                <Settings />
                Settings
              </DropdownMenuItem>
            )}
            {mounted && (
              <DropdownMenuItem onClick={toggleTheme}>
                {getThemeIcon()}
                {getThemeLabel()}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
