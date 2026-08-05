"use client";

import { cn } from "@/lib/utils";
import { AssessmentEntryStatus } from "@/types/hod-assessment";
import { CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: AssessmentEntryStatus;
  className?: string;
}

const statusConfig = {
  completed: {
    label: "Completed",
    icon: CheckCircle,
    className:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  },
  "in-progress": {
    label: "In Progress",
    icon: Clock,
    className:
      "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  },
  "not-started": {
    label: "Not Started",
    icon: XCircle,
    className:
      "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700",
  },
  overdue: {
    label: "Overdue",
    icon: AlertCircle,
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 animate-pulse",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
