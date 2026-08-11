"use client";

import { BookOpen, ClipboardList, TrendingUp } from "lucide-react";
import { FloatingBottomNav } from "@/components/mobile/shared/floating-bottom-nav";

const bottomNavItems = [
  { title: "Classes", href: "/teacher/classes", icon: BookOpen },
  { title: "Assessments", href: "/teacher/assessments", icon: ClipboardList },
  { title: "Performance", href: "/teacher/students", icon: TrendingUp },
];

interface BottomNavProps {
  onMenuOpen: () => void;
  menuOpen?: boolean;
}

export function BottomNav({ onMenuOpen, menuOpen }: BottomNavProps) {
  return (
    <FloatingBottomNav items={bottomNavItems} onMenuOpen={onMenuOpen} menuOpen={menuOpen} />
  );
}
