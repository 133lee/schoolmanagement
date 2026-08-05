"use client";

import React from "react";
import { NavMain } from "@/components/nav-main";
import {
  BookOpen,
  GraduationCap,
  Home,
  ClipboardList,
  Webhook,
  PanelLeftClose,
  PanelLeft,
  FileText,
  BarChart3,
  Grid3X3,
} from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarContent,
  SidebarFooter,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";
import { ContextSwitcher } from "@/components/context-switcher";

interface HodSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    email: string;
    role: string;
    name?: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
}

const hodNavGroups = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/hod",
        icon: Home,
      },
    ],
  },
  {
    label: "Department Resources",
    items: [
      {
        title: "Teachers",
        url: "/hod/teachers",
        icon: GraduationCap,
      },
      {
        title: "Subjects",
        url: "/hod/subjects",
        icon: FileText,
      },
      {
        title: "Classes",
        url: "/hod/classes",
        icon: BookOpen,
      },
      {
        title: "Assignments",
        url: "/hod/assignments",
        icon: Grid3X3,
      },
    ],
  },
  {
    label: "Performance Monitoring",
    items: [
      {
        title: "Assessments",
        url: "/hod/assessments",
        icon: ClipboardList,
      },
      {
        title: "Reports",
        url: "/hod/reports",
        icon: BarChart3,
      },
    ],
  },
];

export function HodSidebar({ user, ...props }: HodSidebarProps) {
  const formatRole = (role: string) => {
    return role
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const getUserName = () => {
    if (!user) return "Guest";
    if (user.profile) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    return user.name || user.email;
  };

  const userData = user
    ? {
        name: getUserName(),
        email: user.email,
        role: formatRole(user.role),
        rawRole: user.role, // Pass the raw role for routing
      }
    : {
        name: "Guest",
        email: "guest@school.com",
        role: "Guest",
      };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarHeaderContent />
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={hodNavGroups} />
      </SidebarContent>
      <SidebarFooter>
        <ContextSwitcher userRole={user?.role} />
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarHeaderContent() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="group/header relative">
          <SidebarMenuButton size="lg" asChild>
            <a href="/hod">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground group-hover/header:opacity-0 transition-opacity">
                <Webhook className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Monarch Devs</span>
                <span className="truncate text-xs">Department Portal</span>
              </div>
            </a>
          </SidebarMenuButton>
          <SidebarTrigger className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/header:opacity-100 transition-opacity data-[state=expanded]:right-1 data-[state=expanded]:left-auto" />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function SidebarTrigger({ className }: { className?: string }) {
  const { toggleSidebar, state } = useSidebar();

  return (
    <div className={className} onClick={toggleSidebar}>
      <div className="flex aspect-square size-8 items-center justify-center rounded-lg hover:bg-muted cursor-pointer transition-colors">
        {state === "expanded" ? (
          <PanelLeftClose className="size-4" />
        ) : (
          <PanelLeft className="size-4" />
        )}
      </div>
    </div>
  );
}
