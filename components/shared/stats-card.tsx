"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "primary" | "success" | "warning" | "danger" | "info";
  subtitle?: string;
}

const variantStyles = {
  primary: "bg-primary/10 text-primary",
  success: "bg-green-500/10 text-green-500",
  warning: "bg-yellow-500/10 text-yellow-500",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-blue-500/10 text-blue-500",
};

export function StatsCard({
  label,
  value,
  icon: Icon,
  variant = "primary",
  subtitle,
}: StatsCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-3 sm:p-4 transition-all hover:shadow-sm">

      {/* ── Mobile: 2-row layout ── */}
      <div className="sm:hidden">
        {/* Row 1: label ←→ icon */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
          <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", variantStyles[variant])}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        {/* Row 2: value only — subtitle detail is desktop-only, it doesn't
            fit cleanly next to the value in a narrow 2-column mobile grid */}
        <div className="mt-2.5">
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </div>

      {/* ── Desktop: original side-by-side layout ── */}
      <div className="hidden sm:flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-medium text-foreground mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", variantStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

    </div>
  );
}
