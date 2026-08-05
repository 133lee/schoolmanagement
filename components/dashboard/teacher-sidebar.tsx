"use client";

import React from "react";
import { NavMain } from "@/components/nav-main";
import {
  BookOpen,
  Home,
  Users,
  ClipboardList,
  Webhook,
  CalendarCheck,
  Calendar,
  PanelLeftClose,
  PanelLeft,
  BarChart3,
  Clock,
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

interface TeacherSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    email: string;
    role: string;
    name?: string;
    hasDefaultPassword?: boolean;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
}

const teacherNavGroups = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/teacher",
        icon: Home,
      },
    ],
  },
  {
    label: "My Classes",
    items: [
      {
        title: "Classes",
        url: "/teacher/classes",
        icon: BookOpen,
      },
      {
        title: "Performance",
        url: "/teacher/students",
        icon: Users,
      },
      {
        title: "Timetable",
        url: "/teacher/timetable",
        icon: Calendar,
      },
    ],
  },
  {
    label: "Teaching & Assessment",
    items: [
      {
        title: "Attendance",
        url: "/teacher/attendance",
        icon: CalendarCheck,
      },
      {
        title: "Assessments",
        url: "/teacher/assessments",
        icon: ClipboardList,
      },
      {
        title: "Lesson Plans",
        url: "/teacher/lesson-plans",
        icon: Clock,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        title: "Class Reports",
        url: "/teacher/reports",
        icon: BarChart3,
      },
    ],
  },
];

export function TeacherSidebar({ user, ...props }: TeacherSidebarProps) {
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
        hasDefaultPassword: user.hasDefaultPassword,
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
        <NavMain groups={teacherNavGroups} />
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
            <a href="/teacher">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground group-hover/header:opacity-0 transition-opacity">
                <Webhook className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Monarch Devs</span>
                <span className="truncate text-xs">Teacher Portal</span>
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
