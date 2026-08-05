"use client";

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  School,
  Bell,
  Shield,
  ChevronRight,
  BookOpen,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";

const settingsSections = [
  {
    title: "Academic Policy",
    description: "Promotion rules, pass criteria, and attendance requirements",
    icon: GraduationCap,
    href: "/admin/settings/academic-policy",
    badge: null,
    badgeColor: "",
  },
  {
    title: "Academic Calendar",
    description: "Manage academic years, terms, and school calendar",
    icon: Calendar,
    href: "/admin/settings/academic-calendar",
    badge: "Critical",
    badgeColor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  {
    title: "Curriculum Management",
    description: "Define which subjects are taught in each grade level",
    icon: BookOpen,
    href: "/admin/settings/curriculum",
    badge: null,
    badgeColor: "",
  },
  {
    title: "School Information",
    description: "Configure school details, contact information, and branding",
    icon: School,
    href: "/admin/settings/school-info",
    badge: null,
    badgeColor: "",
  },
  {
    title: "Notifications & SMS",
    description: "Configure SMS gateways and message templates",
    icon: Bell,
    href: "/admin/settings/notifications",
    badge: null,
    badgeColor: "",
  },
  {
    title: "Security",
    description: "Password policies, session management, and access security",
    icon: Shield,
    href: "/admin/settings/security",
    badge: null,
    badgeColor: "",
  },
  {
    title: "Permissions",
    description: "Manage user roles, permissions, and access control",
    icon: ShieldCheck,
    href: "/admin/permissions",
    badge: null,
    badgeColor: "",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="mt-2">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System configuration and school preferences
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="group block">
              <Card className="h-full transition-all duration-150 hover:shadow-md hover:border-primary/40 group-hover:bg-accent/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-0.5">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          {section.title}
                          {section.badge && (
                            <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full leading-none ${section.badgeColor}`}>
                              {section.badge}
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs leading-snug">
                          {section.description}
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
