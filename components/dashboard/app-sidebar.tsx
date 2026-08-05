"use client";

import React from "react";
import { NavMain } from "@/components/nav-main";
import {
  BookOpen,
  GraduationCap,
  Home,
  Users,
  UserCheck,
  FileText,
  ClipboardList,
  Webhook,
  Building2,
  CalendarCheck,
  BarChart3,
  Calendar,
  PanelLeftClose,
  PanelLeft,
  FileCheck,
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

interface SidebarComponentProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    email: string;
    role: string;
  };
}

const navGroups = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/admin",
        icon: Home,
      },
    ],
  },
  {
    label: "People Management",
    items: [
      {
        title: "Students",
        url: "/admin/students",
        icon: Users,
      },
      {
        title: "Parents",
        url: "/admin/parents",
        icon: UserCheck,
      },
      {
        title: "Teachers",
        url: "/admin/teachers",
        icon: GraduationCap,
      },
    ],
  },
  {
    label: "Academic Management",
    items: [
      {
        title: "Classes",
        url: "/admin/classes",
        icon: BookOpen,
      },
      {
        title: "Subjects",
        url: "/admin/subjects",
        icon: FileText,
      },
      {
        title: "Departments",
        url: "/admin/departments",
        icon: Building2,
      },
      {
        title: "Timetable",
        url: "/admin/timetable",
        icon: Calendar,
        items: [
          {
            title: "Rooms",
            url: "/admin/rooms",
          },
          {
            title: "Configuration",
            url: "/admin/timetable/configuration",
          },
          {
            title: "Generate",
            url: "/admin/timetable/generate",
          },
          {
            title: "View",
            url: "/admin/timetable/view",
          },
        ],
      },
    ],
  },
  {
    label: "Performance & Tracking",
    items: [
      {
        title: "Attendance",
        url: "/admin/attendance/analytics",
        icon: CalendarCheck,
      },
      {
        title: "Assessments",
        url: "/admin/assessments",
        icon: ClipboardList,
      },
      {
        title: "School Statistics",
        url: "/admin/school-statistics",
        icon: BarChart3,
      },
      {
        title: "Report Cards",
        url: "/admin/report-cards",
        icon: FileCheck,
      },
      {
        title: "Reports",
        url: "/admin/reports",
        icon: BarChart3,
      },
    ],
  },
];

export function SidebarComponent({ user, ...props }: SidebarComponentProps) {
  const formatRole = (role: string) => {
    return role
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const userData = user
    ? {
        name: user.email,
        email: user.email,
        role: formatRole(user.role),
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
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarFooter>
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
            <a href="/admin">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground group-hover/header:opacity-0 transition-opacity">
                <Webhook className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Monarch Devs</span>
                <span className="truncate text-xs">
                  School Management System
                </span>
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
