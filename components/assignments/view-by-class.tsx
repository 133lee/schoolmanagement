"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn, formatClassLabel } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  AssignmentClass,
  AssignmentSubject,
  AssignmentTeacher,
  Assignment,
  getSubjectColor,
} from "./types";

interface ViewByClassProps {
  classes: AssignmentClass[];
  subjects: AssignmentSubject[];
  teachers: AssignmentTeacher[];
  assignments: Assignment[];
}

export function ViewByClass({
  classes,
  subjects,
  teachers,
  assignments,
}: ViewByClassProps) {
  const getClassAssignments = (classId: string) => {
    return assignments.filter((a) => a.classId === classId);
  };

  const getSubject = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId);
  };

  const getTeacher = (teacherId: string | null) => {
    if (!teacherId) return null;
    return teachers.find((t) => t.id === teacherId);
  };

  if (classes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>No classes available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">View by Class</h3>
        <Badge variant="secondary" className="text-xs">
          {classes.length} classes
        </Badge>
      </div>

      <Accordion type="multiple" className="space-y-2">
        {classes.map((cls) => {
          const classAssignments = getClassAssignments(cls.id);
          const unassignedCount = classAssignments.filter(
            (a) => !a.teacherId
          ).length;
          const assignedCount = classAssignments.filter(
            (a) => a.teacherId
          ).length;

          return (
            <AccordionItem
              key={cls.id}
              value={cls.id}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/50">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {cls.name.split(" ")[0].substring(0, 3)}
                      </span>
                    </span>
                    <div className="text-left">
                      <p className="font-medium text-foreground">
                        {formatClassLabel(cls.grade, cls.name)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {unassignedCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs border-destructive/30 text-destructive"
                      >
                        {unassignedCount} unassigned
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-xs border-green-500/30 text-green-600"
                    >
                      {assignedCount} assigned
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 pt-2">
                  {classAssignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No subject assignments for this class
                    </p>
                  ) : (
                    classAssignments.map((assignment) => {
                      const subject = getSubject(assignment.subjectId);
                      const teacher = getTeacher(assignment.teacherId);
                      const isAssigned = !!teacher;

                      return (
                        <div
                          key={assignment.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            isAssigned
                              ? "bg-green-500/5 border-green-500/20"
                              : "bg-destructive/5 border-destructive/20"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor:
                                  subject?.color ||
                                  getSubjectColor(subject?.name || ""),
                              }}
                            />
                            <span className="font-medium text-sm text-foreground">
                              {subject?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAssigned ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-sm text-foreground">
                                  {teacher?.name}
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <span className="text-sm text-destructive">
                                  Not Assigned
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
