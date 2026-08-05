"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Calendar, ClipboardList, TrendingUp, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { title: "Classes", href: "/teacher/classes", icon: BookOpen },
  { title: "Timetable", href: "/teacher/timetable", icon: Calendar },
  { title: "Assessments", href: "/teacher/assessments", icon: ClipboardList },
  { title: "Performance", href: "/teacher/students", icon: TrendingUp },
];

interface BottomNavProps {
  onMenuOpen: () => void;
}

export function BottomNav({ onMenuOpen }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="flex items-stretch h-16">
        {bottomNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn("size-5", isActive && "stroke-[2.5px]")}
              />
              <span>{item.title}</span>
            </Link>
          );
        })}

        <button
          onClick={onMenuOpen}
          className="flex flex-col items-center justify-center gap-1 flex-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="size-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
