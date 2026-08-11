"use client";

import { Users, GraduationCap, BookOpen, BarChart3 } from "lucide-react";
import { FloatingBottomNav } from "@/components/mobile/shared/floating-bottom-nav";

const bottomNavItems = [
  { title: "Students", href: "/admin/students", icon: Users        },
  { title: "Teachers", href: "/admin/teachers", icon: GraduationCap },
  { title: "Classes",  href: "/admin/classes",  icon: BookOpen     },
  { title: "Reports",  href: "/admin/reports",  icon: BarChart3    },
];

interface BottomNavProps {
  onMenuOpen: () => void;
  menuOpen?: boolean;
}

export function AdminBottomNav({ onMenuOpen, menuOpen }: BottomNavProps) {
  return (
    <FloatingBottomNav items={bottomNavItems} onMenuOpen={onMenuOpen} menuOpen={menuOpen} />
  );
}
