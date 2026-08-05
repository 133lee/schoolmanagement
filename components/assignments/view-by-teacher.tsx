"use client";

import { User, Mail, Phone, BookOpen, Users, Clock } from "lucide-react";
import { cn, formatClassLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AssignmentTeacher,
  AssignmentSubject,
  AssignmentClass,
  Assignment,
  getLoadStatus,
  getSubjectColor,
} from "./types";

interface ViewByTeacherProps {
  teachers: AssignmentTeacher[];
  subjects: AssignmentSubject[];
  classes: AssignmentClass[];
  assignments: Assignment[];
}

export function ViewByTeacher({
  teachers,
  subjects,
  classes,
  assignments,
}: ViewByTeacherProps) {
  const getTeacherAssignments = (teacherId: string) => {
    return assignments.filter((a) => a.teacherId === teacherId);
  };

  const getSubject = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId);
  };

  const getClass = (classId: string) => {
    return classes.find((c) => c.id === classId);
  };

  if (teachers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>No teachers available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          View by Teacher
        </h3>
        <Badge variant="secondary" className="text-xs">
          {teachers.length} teachers
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {teachers.map((teacher) => {
          const teacherAssignments = getTeacherAssignments(teacher.id);
          const status = getLoadStatus(teacher);
          const progressPercent = Math.min(
            (teacher.periodsPerWeek / teacher.maxPeriods) * 100,
            100
          );

          // Group assignments by subject
          const subjectGroups = teacherAssignments.reduce(
            (acc, assignment) => {
              const subject = getSubject(assignment.subjectId);
              if (subject) {
                if (!acc[subject.id]) {
                  acc[subject.id] = { subject, classes: [] };
                }
                const cls = getClass(assignment.classId);
                if (cls) {
                  acc[subject.id].classes.push(cls);
                }
              }
              return acc;
            },
            {} as Record<
              string,
              { subject: AssignmentSubject; classes: AssignmentClass[] }
            >
          );

          return (
            <Card key={teacher.id} className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground truncate">
                        {teacher.name}
                      </h4>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-medium ml-2 shrink-0",
                          status === "normal" &&
                            "border-green-500/30 text-green-600",
                          status === "overloaded" &&
                            "border-destructive/30 text-destructive",
                          status === "underutilized" &&
                            "border-yellow-500/30 text-yellow-600"
                        )}
                      >
                        {status === "normal"
                          ? "Normal Load"
                          : status === "overloaded"
                            ? "Overloaded"
                            : "Underutilized"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {teacher.email}
                      </span>
                    </div>
                    {teacher.phone && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {teacher.phone}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Users className="h-3 w-3" />
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {teacher.totalClasses}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Classes
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <BookOpen className="h-3 w-3" />
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {Object.keys(subjectGroups).length}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Subjects
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Clock className="h-3 w-3" />
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {teacher.periodsPerWeek}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Periods/wk
                    </div>
                  </div>
                </div>

                {/* Workload progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Workload</span>
                    <span className="font-medium text-foreground">
                      {teacher.periodsPerWeek}/{teacher.maxPeriods} periods
                    </span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className={cn(
                      "h-2",
                      status === "overloaded" && "[&>div]:bg-destructive",
                      status === "underutilized" && "[&>div]:bg-yellow-500",
                      status === "normal" && "[&>div]:bg-green-500"
                    )}
                  />
                </div>

                {/* Subjects taught */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Teaching Assignments
                  </p>
                  {Object.keys(subjectGroups).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No assignments yet
                    </p>
                  ) : (
                    Object.values(subjectGroups).map(({ subject, classes }) => (
                      <div
                        key={subject.id}
                        className="flex items-center justify-between bg-secondary/50 rounded-lg p-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor:
                                subject.color || getSubjectColor(subject.name),
                            }}
                          />
                          <span className="text-sm font-medium text-foreground">
                            {subject.name}
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {classes.map((cls) => (
                            <Badge
                              key={cls.id}
                              variant="outline"
                              className="text-[10px] bg-card"
                            >
                              {formatClassLabel(cls.grade, cls.name)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
