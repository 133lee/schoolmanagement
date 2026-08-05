"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max,
  className,
  showLabel = true,
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  const getBarColor = () => {
    if (percentage === 100) return "bg-green-500";
    if (percentage > 0) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            getBarColor()
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-right">
          {percentage}%
        </span>
      )}
    </div>
  );
}
