"use client";

import { format } from "date-fns";
import {
  X,
  Bell,
  Lock,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  User,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TeacherAssessmentEntry,
  StudentEntryDetail,
} from "@/types/hod-assessment";
import { StatusBadge } from "./status-badge";
import { ProgressBar } from "./progress-bar";
import { cn } from "@/lib/utils";

interface DetailDrawerProps {
  assessment: TeacherAssessmentEntry | null;
  studentEntries: StudentEntryDetail[];
  isOpen: boolean;
  onClose: () => void;
  onSendReminder: (assessment: TeacherAssessmentEntry) => void;
  onLockAssessment: (assessment: TeacherAssessmentEntry) => void;
  onContactTeacher: (assessment: TeacherAssessmentEntry) => void;
}

export function DetailDrawer({
  assessment,
  studentEntries,
  isOpen,
  onClose,
  onSendReminder,
  onLockAssessment,
  onContactTeacher,
}: DetailDrawerProps) {
  if (!assessment) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const enteredCount = studentEntries.filter((s) => s.scoreEntered).length;
  const missingCount = studentEntries.filter((s) => !s.scoreEntered).length;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg p-0 overflow-hidden">
        <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                  {getInitials(assessment.teacherName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-lg font-semibold">
                  {assessment.teacherName}
                </SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {assessment.teacherEmail}
                </p>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Assessment Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Subject</p>
                  <p className="font-semibold text-lg">{assessment.subject}</p>
                </div>
                <StatusBadge status={assessment.status} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-medium">{assessment.className}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Deadline</p>
                  <p className="font-medium">
                    {format(new Date(assessment.deadline), "MMM dd, yyyy")}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Entry Progress</p>
                  <p className="text-sm font-medium">
                    {assessment.scoresEntered} / {assessment.totalStudents}{" "}
                    students
                  </p>
                </div>
                <ProgressBar
                  value={assessment.scoresEntered}
                  max={assessment.totalStudents}
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Last updated:{" "}
                {format(new Date(assessment.lastUpdated), "PPpp")}
              </div>
            </div>

            <Separator />

            {/* Entry Summary */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                Student Entry Breakdown
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-2xl font-bold">{enteredCount}</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Scores Entered
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <XCircle className="w-5 h-5" />
                    <span className="text-2xl font-bold">{missingCount}</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Missing Entries
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Student List */}
            <div className="space-y-3">
              <h3 className="font-semibold">Student Details</h3>
              <div className="space-y-2">
                {studentEntries.map((student) => (
                  <div
                    key={student.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      student.scoreEntered
                        ? "bg-green-50/50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                        : "bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-background">
                          {getInitials(student.studentName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {student.studentName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.admissionNumber}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {student.scoreEntered ? (
                        <div>
                          <p className="font-semibold text-green-700 dark:text-green-300">
                            {student.score}/{student.maxScore}
                          </p>
                          {student.enteredAt && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(student.enteredAt), "MMM dd, HH:mm")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                          Not Entered
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => onSendReminder(assessment)}
          >
            <Bell className="w-4 h-4" />
            Send Reminder
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => onContactTeacher(assessment)}
          >
            <Mail className="w-4 h-4" />
            Contact
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => onLockAssessment(assessment)}
            disabled={assessment.status !== "completed"}
          >
            <Lock className="w-4 h-4" />
            Lock
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
