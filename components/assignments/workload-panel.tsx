"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  AssignmentTeacher,
  LoadStatus,
  getLoadStatus,
  getLoadLabel,
} from "./types";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User } from "lucide-react";

interface WorkloadPanelProps {
  teachers: AssignmentTeacher[];
}

type FilterStatus = "all" | LoadStatus;

export function WorkloadPanel({ teachers }: WorkloadPanelProps) {
  const [filter, setFilter] = useState<FilterStatus>("all");

  const stats = {
    total: teachers.length,
    overloaded: teachers.filter((t) => getLoadStatus(t) === "overloaded").length,
    underutilized: teachers.filter((t) => getLoadStatus(t) === "underutilized").length,
    normal: teachers.filter((t) => getLoadStatus(t) === "normal").length,
  };

  const avgUtilization =
    teachers.length > 0
      ? Math.round(
          teachers.reduce(
            (sum, t) => sum + (t.periodsPerWeek / t.maxPeriods) * 100,
            0
          ) / teachers.length
        )
      : 0;

  const filtered = [...teachers]
    .filter((t) => filter === "all" || getLoadStatus(t) === filter)
    .sort((a, b) => {
      const order: Record<LoadStatus, number> = {
        overloaded: 0,
        underutilized: 1,
        normal: 2,
      };
      return order[getLoadStatus(a)] - order[getLoadStatus(b)];
    });

  const filterButtons: {
    value: FilterStatus;
    label: string;
    count: number;
  }[] = [
    { value: "all", label: "All", count: stats.total },
    { value: "overloaded", label: "Overloaded", count: stats.overloaded },
    { value: "normal", label: "Normal", count: stats.normal },
    { value: "underutilized", label: "Under", count: stats.underutilized },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Summary header */}
      <div className="p-4 space-y-4 border-b">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1">
              Avg. Utilization
            </p>
            <p className="text-3xl font-bold leading-none">{avgUtilization}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total} teacher{stats.total !== 1 ? "s" : ""} in department
            </p>
          </div>
          <div className="flex gap-2">
            <MiniStat
              label="Overloaded"
              value={stats.overloaded}
              color="destructive"
            />
            <MiniStat label="Normal" value={stats.normal} color="green" />
            <MiniStat
              label="Under"
              value={stats.underutilized}
              color="yellow"
            />
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1">
          {filterButtons.map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "flex-1 text-[11px] px-2 py-1.5 rounded-md font-medium transition-colors",
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {label}
              {count > 0 && (
                <span className="ml-1 opacity-70">({count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No teachers in this category
              </p>
            </div>
          ) : (
            filtered.map((teacher) => (
              <TeacherWorkloadCard key={teacher.id} teacher={teacher} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "destructive" | "green" | "yellow";
}) {
  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2 text-center min-w-[52px]",
        color === "destructive" && "bg-destructive/10",
        color === "green" && "bg-green-500/10",
        color === "yellow" && "bg-yellow-500/10"
      )}
    >
      <p
        className={cn(
          "text-lg font-bold leading-none",
          color === "destructive" && "text-destructive",
          color === "green" && "text-green-600",
          color === "yellow" && "text-yellow-600"
        )}
      >
        {value}
      </p>
      <p className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}

function TeacherWorkloadCard({ teacher }: { teacher: AssignmentTeacher }) {
  const status = getLoadStatus(teacher);
  const pct = Math.min((teacher.periodsPerWeek / teacher.maxPeriods) * 100, 100);

  const borderColor = {
    normal: "border-l-green-500",
    overloaded: "border-l-destructive",
    underutilized: "border-l-yellow-500",
  }[status];

  const valueColor = {
    normal: "text-green-600",
    overloaded: "text-destructive",
    underutilized: "text-yellow-600",
  }[status];

  const badgeCn = cn(
    "text-[9px] font-medium shrink-0 px-1.5 py-0",
    status === "normal" &&
      "border-green-500/30 text-green-700 bg-green-500/10",
    status === "overloaded" &&
      "border-destructive/30 text-destructive bg-destructive/10",
    status === "underutilized" &&
      "border-yellow-500/30 text-yellow-700 bg-yellow-500/10"
  );

  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border border-l-[3px] px-3 py-2 transition-all hover:shadow-sm",
        borderColor
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">
            {teacher.name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {teacher.totalClasses}{" "}
            {teacher.totalClasses === 1 ? "class" : "classes"}
          </p>
        </div>
        <Badge variant="outline" className={badgeCn}>
          {getLoadLabel(status)}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mt-1.5">
        <Progress
          value={pct}
          className={cn(
            "h-1.5 flex-1",
            status === "overloaded" && "[&>div]:bg-destructive",
            status === "underutilized" && "[&>div]:bg-yellow-500",
            status === "normal" && "[&>div]:bg-green-500"
          )}
        />
        <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
          <span className={cn("font-semibold", valueColor)}>
            {teacher.periodsPerWeek}
          </span>
          /{teacher.maxPeriods}
        </span>
      </div>
    </div>
  );
}
