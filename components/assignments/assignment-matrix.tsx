"use client";

import { AlertTriangle, Pencil, ChevronDown, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AssignmentSubject,
  AssignmentClass,
  AssignmentTeacher,
  Assignment,
  getSubjectColor,
} from "./types";

interface AssignmentMatrixProps {
  subjects: AssignmentSubject[];
  classes: AssignmentClass[];
  teachers: AssignmentTeacher[];
  assignments: Assignment[];
  onAssign: (subjectId: string, classId: string, teacherId: string) => void;
  onUnassign?: (assignmentId: string) => void;
  isLoading?: boolean;
}

// Form-grade classes are already named "F1 Blue", "F2-A", etc. — self
// identifying. Anything else (e.g. a bare "A") gets the grade's number
// prefixed instead, for the narrower mobile column headers.
function formatMobileClassLabel(cls: AssignmentClass) {
  if (/^f[1-5]\b/i.test(cls.name)) return cls.name;
  const gradeNumber = cls.grade?.match(/\d+/)?.[0];
  if (!gradeNumber || cls.name.trim().startsWith(gradeNumber)) return cls.name;
  return `${gradeNumber} ${cls.name}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

export function AssignmentMatrix({
  subjects,
  classes,
  teachers,
  assignments,
  onAssign,
  onUnassign,
  isLoading = false,
}: AssignmentMatrixProps) {
  const getAssignment = (subjectId: string, classId: string) => {
    return assignments.find(
      (a) => a.subjectId === subjectId && a.classId === classId
    );
  };

  const getTeacher = (teacherId: string | null) => {
    if (!teacherId) return null;
    return teachers.find((t) => t.id === teacherId);
  };

  if (isLoading) {
    return <MatrixSkeleton rows={4} cols={8} />;
  }

  if (subjects.length === 0 || classes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>No subjects or classes available to display</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border min-w-[160px]">
              Subject
            </th>
            {classes.map((cls) => (
              <th
                key={cls.id}
                className="px-3 py-3 text-center text-sm font-semibold text-foreground border-b border-border min-w-[120px]"
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="lg:hidden">{formatMobileClassLabel(cls)}</span>
                  <span className="hidden lg:inline">{cls.grade} {cls.name}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject, idx) => (
            <tr
              key={subject.id}
              className={cn(
                "transition-colors hover:bg-muted/50",
                idx % 2 === 0 ? "bg-card" : "bg-secondary/30"
              )}
            >
              <td className="sticky left-0 z-10 bg-inherit px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        subject.color || getSubjectColor(subject.name),
                    }}
                  />
                  <span className="font-medium text-sm text-foreground">
                    <span className="lg:hidden">{subject.code}</span>
                    <span className="hidden lg:inline">{subject.name}</span>
                  </span>
                </div>
              </td>
              {classes.map((cls) => {
                const assignment = getAssignment(subject.id, cls.id);
                const teacher = assignment
                  ? getTeacher(assignment.teacherId)
                  : null;
                const isAssigned = !!teacher;

                return (
                  <td key={cls.id} className="px-2 py-2 border-b border-border">
                    <AssignmentCell
                      teacher={teacher ?? null}
                      isAssigned={isAssigned}
                      teachers={teachers}
                      onAssign={(teacherId) =>
                        onAssign(subject.id, cls.id, teacherId)
                      }
                      onUnassign={
                        onUnassign && assignment
                          ? () => onUnassign(assignment.id)
                          : undefined
                      }
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface AssignmentCellProps {
  teacher: AssignmentTeacher | null;
  isAssigned: boolean;
  teachers: AssignmentTeacher[];
  onAssign: (teacherId: string) => void;
  onUnassign?: () => void;
}

function AssignmentCell({
  teacher,
  isAssigned,
  teachers,
  onAssign,
  onUnassign,
}: AssignmentCellProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full h-auto min-h-[48px] px-2 py-2 justify-between text-left font-normal group",
                isAssigned
                  ? "bg-green-500/5 hover:bg-green-500/10 border border-green-500/20"
                  : "bg-destructive/5 hover:bg-destructive/10 border border-destructive/20"
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {isAssigned ? (
                  <span className="truncate text-sm font-medium text-foreground">
                    <span className="lg:hidden">{getInitials(teacher!.name)}</span>
                    <span className="hidden lg:inline">{teacher?.name}</span>
                  </span>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-sm text-destructive">
                      <span className="lg:hidden">NA</span>
                      <span className="hidden lg:inline">Not Assigned</span>
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Pencil className="h-3 w-3 text-muted-foreground" />
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        {teacher && (
          <TooltipContent side="top" className="max-w-[200px]">
            <div className="text-xs space-y-1">
              <p className="font-medium">{teacher.name}</p>
              <p className="text-muted-foreground">{teacher.email}</p>
              {teacher.phone && (
                <p className="text-muted-foreground">{teacher.phone}</p>
              )}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
      <DropdownMenuContent align="start" className="w-[200px]">
        {teachers.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => onAssign(t.id)}
            className={cn(
              "cursor-pointer",
              t.id === teacher?.id && "bg-accent/10"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span>{t.name}</span>
              {t.periodsPerWeek >= t.maxPeriods && (
                <span className="text-[10px] text-destructive font-medium">
                  FULL
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        {isAssigned && onUnassign && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onUnassign}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <UserMinus className="h-3.5 w-3.5 mr-2" />
              Unassign
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MatrixSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="overflow-x-auto p-4">
      <div className="space-y-2 min-w-max">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32 lg:w-40 shrink-0" />
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 lg:w-28 shrink-0" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-3">
            <Skeleton className="h-14 w-32 lg:w-40 shrink-0" />
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton key={colIdx} className="h-14 w-24 lg:w-28 shrink-0" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
