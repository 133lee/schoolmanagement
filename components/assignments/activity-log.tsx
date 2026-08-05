"use client";

import { useState } from "react";
import { Clock, UserPlus, RefreshCw, UserMinus, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActivityLogItem } from "./types";
import type { SchoolTerm } from "@/app/(dashboard)/hod/assignments/page";

interface ActivityLogProps {
  activities: ActivityLogItem[];
  schoolTerms?: SchoolTerm[];
}

const actionConfig: Record<
  ActivityLogItem["action"],
  {
    Icon: React.ElementType;
    iconCn: string;
    label: string;
    badgeCn: string;
    badgeLabel: string;
  }
> = {
  assigned: {
    Icon: UserPlus,
    iconCn: "text-green-600 bg-green-500/10",
    label: "assigned to",
    badgeCn: "bg-green-500/10 text-green-700 border-green-500/20",
    badgeLabel: "Assigned",
  },
  reassigned: {
    Icon: RefreshCw,
    iconCn: "text-blue-600 bg-blue-500/10",
    label: "reassigned to",
    badgeCn: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    badgeLabel: "Reassigned",
  },
  unassigned: {
    Icon: UserMinus,
    iconCn: "text-destructive bg-destructive/10",
    label: "removed from",
    badgeCn: "bg-destructive/10 text-destructive border-destructive/20",
    badgeLabel: "Removed",
  },
};

function getRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return timestamp;

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function getDateGroup(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "Other";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDay.getTime() === today.getTime()) return "Today";
  if (itemDay.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ActivityLog({ activities, schoolTerms = [] }: ActivityLogProps) {
  const [selectedTermId, setSelectedTermId] = useState<string>("all");

  // Filter activities by selected term's date range
  const filtered = activities.filter((activity) => {
    if (selectedTermId === "all") return true;
    const term = schoolTerms.find((t) => t.id === selectedTermId);
    if (!term?.startDate || !term?.endDate) return true;
    const ts = new Date(activity.timestamp).getTime();
    return (
      ts >= new Date(term.startDate).getTime() &&
      ts <= new Date(term.endDate).getTime()
    );
  });

  // Group by date
  const groups: { label: string; items: ActivityLogItem[] }[] = [];
  const seen = new Map<string, ActivityLogItem[]>();

  for (const item of filtered) {
    const group = getDateGroup(item.timestamp);
    if (!seen.has(group)) {
      const arr: ActivityLogItem[] = [];
      seen.set(group, arr);
      groups.push({ label: group, items: arr });
    }
    seen.get(group)!.push(item);
  }

  const activeTerm = schoolTerms.find((t) => t.isActive);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold">Recent Activity</span>
          </div>
          {filtered.length > 0 && (
            <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium tabular-nums">
              {filtered.length}
            </span>
          )}
        </div>

        {/* Term filter */}
        {schoolTerms.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
            <Select value={selectedTermId} onValueChange={setSelectedTermId}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Filter by term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {schoolTerms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                    {term.isActive && (
                      <span className="ml-1.5 text-[10px] text-primary font-medium">
                        (Active)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="text-center py-14 px-6">
            <Clock className="h-9 w-9 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {selectedTermId === "all"
                ? "No activity yet"
                : "No activity in this term"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {selectedTermId === "all"
                ? "Assignment changes will appear here"
                : "Try selecting a different term"}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {groups.map(({ label, items }) => (
              <div key={label}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>{label}</span>
                  <span className="flex-1 h-px bg-border" />
                  <span>{items.length}</span>
                </p>
                <div className="space-y-2">
                  {items.map((activity) => {
                    const {
                      Icon,
                      iconCn,
                      label: actionLabel,
                      badgeCn,
                      badgeLabel,
                    } = actionConfig[activity.action];
                    return (
                      <div
                        key={activity.id}
                        className="flex gap-3 items-start bg-muted/30 hover:bg-muted/50 transition-colors rounded-lg p-3"
                      >
                        <div
                          className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                            iconCn
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-snug">
                            <span className="font-semibold">
                              {activity.teacherName}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {actionLabel}
                            </span>{" "}
                            <span className="font-semibold">
                              {activity.subjectName}
                            </span>{" "}
                            <span className="text-muted-foreground">in</span>{" "}
                            <span className="font-medium">
                              {activity.className}
                            </span>
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {getRelativeTime(activity.timestamp)}
                          </p>
                        </div>

                        <span
                          className={cn(
                            "text-[9px] font-bold border rounded px-1.5 py-0.5 shrink-0 mt-0.5 uppercase tracking-wide",
                            badgeCn
                          )}
                        >
                          {badgeLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
