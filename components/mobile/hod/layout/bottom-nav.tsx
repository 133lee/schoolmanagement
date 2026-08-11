"use client";

import { BookOpen, ClipboardList, BarChart3, GraduationCap } from "lucide-react";
import { FloatingBottomNav } from "@/components/mobile/shared/floating-bottom-nav";

const bottomNavItems = [
  { title: "Classes",     href: "/hod/classes",     icon: BookOpen      },
  { title: "Assessments", href: "/hod/assessments", icon: ClipboardList },
  { title: "Reports",     href: "/hod/reports",     icon: BarChart3     },
  { title: "Teachers",    href: "/hod/teachers",    icon: GraduationCap },
];

interface BottomNavProps {
  onMenuOpen: () => void;
  menuOpen?: boolean;
}

export function HodBottomNav({ onMenuOpen, menuOpen }: BottomNavProps) {
  return (
    <FloatingBottomNav items={bottomNavItems} onMenuOpen={onMenuOpen} menuOpen={menuOpen} />
  );
}
