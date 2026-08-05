"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant: "success" | "warning" | "danger" | "info";
  className?: string;
}

const variantStyles = {
  success: "bg-green-500/10 text-green-500",
  warning: "bg-yellow-500/10 text-yellow-500",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-blue-500/10 text-blue-500",
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  variant,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border p-3 lg:p-4 transition-all hover:shadow-sm",
        className
      )}
    >
      {/* ── Mobile: title on top row, value + icon on bottom row ── */}
      <div className="flex flex-col gap-1.5 lg:hidden">
        <p className="text-xs text-muted-foreground truncate">{title}</p>
        <div className="flex items-center justify-between">
          <p className="text-xl font-bold text-foreground">{value}</p>
          <div
            className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
              variantStyles[variant]
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* ── Desktop: original single-row layout ── */}
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center",
            variantStyles[variant]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
