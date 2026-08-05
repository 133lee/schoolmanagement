"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Eye,
  Bell,
  Clock,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TeacherAssessmentEntry } from "@/types/hod-assessment";
import { StatusBadge } from "./status-badge";
import { ProgressBar } from "./progress-bar";
import { cn } from "@/lib/utils";

interface AssessmentTableProps {
  assessments: TeacherAssessmentEntry[];
  onViewDetails: (assessment: TeacherAssessmentEntry) => void;
  onSendReminder: (assessment: TeacherAssessmentEntry) => void;
  onExtendDeadline: (assessment: TeacherAssessmentEntry) => void;
}

type SortKey =
  | "teacherName"
  | "subject"
  | "className"
  | "progress"
  | "deadline"
  | "status";
type SortOrder = "asc" | "desc";

export function AssessmentTable({
  assessments,
  onViewDetails,
  onSendReminder,
  onExtendDeadline,
}: AssessmentTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("deadline");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedAssessments = [...assessments].sort((a, b) => {
    const modifier = sortOrder === "asc" ? 1 : -1;

    switch (sortKey) {
      case "teacherName":
        return a.teacherName.localeCompare(b.teacherName) * modifier;
      case "subject":
        return a.subject.localeCompare(b.subject) * modifier;
      case "className":
        return a.className.localeCompare(b.className) * modifier;
      case "progress":
        return (
          (a.scoresEntered / a.totalStudents -
            b.scoresEntered / b.totalStudents) *
          modifier
        );
      case "deadline":
        return (
          (new Date(a.deadline).getTime() - new Date(b.deadline).getTime()) *
          modifier
        );
      case "status":
        return a.status.localeCompare(b.status) * modifier;
      default:
        return 0;
    }
  });

  const SortHeader = ({
    label,
    sortKeyName,
  }: {
    label: string;
    sortKeyName: SortKey;
  }) => (
    <button
      onClick={() => handleSort(sortKeyName)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === sortKeyName &&
        (sortOrder === "asc" ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        ))}
    </button>
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (assessments.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm border p-8 text-center">
        <p className="text-muted-foreground">
          No assessment entries found matching your criteria.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-foreground">
                  <SortHeader label="Teacher" sortKeyName="teacherName" />
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  <SortHeader label="Subject" sortKeyName="subject" />
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  <SortHeader label="Class" sortKeyName="className" />
                </TableHead>
                <TableHead className="font-semibold text-foreground text-center">
                  Students
                </TableHead>
                <TableHead className="font-semibold text-foreground min-w-[180px]">
                  <SortHeader label="Progress" sortKeyName="progress" />
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  <SortHeader label="Status" sortKeyName="status" />
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  <SortHeader label="Deadline" sortKeyName="deadline" />
                </TableHead>
                <TableHead className="font-semibold text-foreground text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssessments.map((assessment) => (
                <TableRow
                  key={assessment.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    assessment.status === "overdue" && "bg-red-50/50 dark:bg-red-950/30"
                  )}
                  onClick={() => onViewDetails(assessment)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                          {getInitials(assessment.teacherName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {assessment.teacherName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assessment.teacherEmail}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {assessment.subject}
                  </TableCell>
                  <TableCell>{assessment.className}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">
                      {assessment.scoresEntered}
                    </span>
                    <span className="text-muted-foreground">
                      /{assessment.totalStudents}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ProgressBar
                      value={assessment.scoresEntered}
                      max={assessment.totalStudents}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={assessment.status} />
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(new Date(assessment.deadline), "MMM dd, yyyy")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Last updated:{" "}
                            {format(new Date(assessment.lastUpdated), "MMM dd, HH:mm")}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Last activity:{" "}
                          {format(new Date(assessment.lastUpdated), "PPpp")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onViewDetails(assessment)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onSendReminder(assessment)}
                        >
                          <Bell className="w-4 h-4 mr-2" />
                          Send Reminder
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onExtendDeadline(assessment)}
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          Extend Deadline
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
