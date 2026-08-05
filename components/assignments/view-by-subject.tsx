"use client";

import { CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AssignmentSubject,
  AssignmentClass,
  AssignmentTeacher,
  Assignment,
  getSubjectColor,
} from "./types";

interface ViewBySubjectProps {
  subjects: AssignmentSubject[];
  classes: AssignmentClass[];
  teachers: AssignmentTeacher[];
  assignments: Assignment[];
}

export function ViewBySubject({
  subjects,
  classes,
  teachers,
  assignments,
}: ViewBySubjectProps) {
  const getSubjectAssignments = (subjectId: string) => {
    return assignments.filter((a) => a.subjectId === subjectId);
  };

  const getClass = (classId: string) => {
    return classes.find((c) => c.id === classId);
  };

  const getTeacher = (teacherId: string | null) => {
    if (!teacherId) return null;
    return teachers.find((t) => t.id === teacherId);
  };

  if (subjects.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>No subjects available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          View by Subject
        </h3>
        <Badge variant="secondary" className="text-xs">
          {subjects.length} subjects
        </Badge>
      </div>

      <div className="grid gap-4">
        {subjects.map((subject) => {
          const subjectAssignments = getSubjectAssignments(subject.id);
          const unassignedCount = subjectAssignments.filter(
            (a) => !a.teacherId
          ).length;
          const assignedCount = subjectAssignments.filter(
            (a) => a.teacherId
          ).length;
          const subjectColor = subject.color || getSubjectColor(subject.name);

          return (
            <Card key={subject.id} className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${subjectColor}20` }}
                    >
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: subjectColor }}
                      />
                    </span>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {subject.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {subject.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {unassignedCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs border-destructive/30 text-destructive"
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {unassignedCount} gaps
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-xs border-green-500/30 text-green-600"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {assignedCount} assigned
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {subjectAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No class assignments for this subject
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {subjectAssignments.map((assignment) => {
                      const cls = getClass(assignment.classId);
                      const teacher = getTeacher(assignment.teacherId);
                      const isAssigned = !!teacher;

                      return (
                        <div
                          key={assignment.id}
                          className={cn(
                            "p-3 rounded-lg border",
                            isAssigned
                              ? "bg-card border-border"
                              : "bg-destructive/5 border-destructive/20"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant="secondary"
                              className="text-xs font-medium"
                            >
                              {cls?.grade} {cls?.name}
                            </Badge>
                            {isAssigned ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p
                              className={cn(
                                "text-sm font-medium",
                                isAssigned
                                  ? "text-foreground"
                                  : "text-destructive"
                              )}
                            >
                              {isAssigned ? teacher?.name : "Not Assigned"}
                            </p>
                            {assignment.assignedDate && (
                              <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Assigned{" "}
                                {new Date(
                                  assignment.assignedDate
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
