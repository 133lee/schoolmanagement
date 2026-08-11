"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FloatingBottomNavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface FloatingBottomNavProps {
  items: FloatingBottomNavItem[];
  onMenuOpen: () => void;
  menuOpen?: boolean;
}

/**
 * Floating, detached bottom nav shared across the teacher/HOD/admin mobile
 * shells — a dark glass pill with a blue glow, sitting clear of the screen
 * edges so page content can still scroll fully underneath it.
 */
export function FloatingBottomNav({ items, onMenuOpen, menuOpen }: FloatingBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed left-4 right-4 z-50 mx-auto max-w-sm"
      style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}
    >
      <div
        className={cn(
          "flex items-stretch h-16 rounded-3xl border border-white/10",
          "bg-neutral-950/85 backdrop-blur-xl backdrop-saturate-150",
          "shadow-[0_8px_30px_-6px_rgba(0,0,0,0.5),0_0_24px_-8px_rgba(59,130,246,0.45)]"
        )}
      >
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium"
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full h-7 w-9 transition-colors",
                  isActive ? "bg-blue-500/20" : ""
                )}
              >
                <item.icon
                  className={cn(
                    "size-5 transition-colors",
                    isActive
                      ? "text-blue-400 stroke-[2.5px]"
                      : "text-neutral-400"
                  )}
                />
              </span>
              <span className={isActive ? "text-blue-400" : "text-neutral-400"}>
                {item.title}
              </span>
            </Link>
          );
        })}

        <button
          onClick={onMenuOpen}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium"
        >
          <span
            className={cn(
              "flex items-center justify-center rounded-full h-7 w-9 transition-colors",
              menuOpen ? "bg-blue-500/20" : ""
            )}
          >
            <Menu
              className={cn(
                "size-5 transition-colors",
                menuOpen ? "text-blue-400 stroke-[2.5px]" : "text-neutral-400"
              )}
            />
          </span>
          <span className={menuOpen ? "text-blue-400" : "text-neutral-400"}>
            More
          </span>
        </button>
      </div>
    </nav>
  );
}
