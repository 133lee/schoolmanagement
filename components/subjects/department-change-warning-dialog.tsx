"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Users, BookOpen, ClipboardList, GraduationCap } from "lucide-react";

interface SubjectUsage {
  isInUse: boolean;
  hasTeachers: boolean;
  teacherCount: number;
  hasClasses: boolean;
  classCount: number;
  hasAssessments: boolean;
  assessmentCount: number;
  hasGrades: boolean;
  gradeCount: number;
  hasTimetableSlots: boolean;
  timetableSlotCount: number;
  subject: {
    id: string;
    name: string;
    code: string;
    departmentId: string | null;
  };
}

interface DepartmentChangeWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usage: SubjectUsage | null;
  onConfirm: () => void;
  onCancel: () => void;
  changeSummary: string; // e.g., "from Science to Mathematics" or "removing department assignment"
}

export function DepartmentChangeWarningDialog({
  open,
  onOpenChange,
  usage,
  onConfirm,
  onCancel,
  changeSummary,
}: DepartmentChangeWarningDialogProps) {
  if (!usage) return null;

  const usageItems = [];

  if (usage.hasTeachers) {
    usageItems.push({
      icon: Users,
      label: `${usage.teacherCount} teacher${usage.teacherCount > 1 ? "s" : ""} assigned`,
      color: "text-blue-600",
    });
  }

  if (usage.hasClasses) {
    usageItems.push({
      icon: BookOpen,
      label: `${usage.classCount} class${usage.classCount > 1 ? "es" : ""} teaching this subject`,
      color: "text-purple-600",
    });
  }

  if (usage.hasAssessments) {
    usageItems.push({
      icon: ClipboardList,
      label: `${usage.assessmentCount} assessment${usage.assessmentCount > 1 ? "s" : ""} recorded`,
      color: "text-amber-600",
    });
  }

  if (usage.hasGrades) {
    usageItems.push({
      icon: GraduationCap,
      label: `${usage.gradeCount} student grade${usage.gradeCount > 1 ? "s" : ""} recorded`,
      color: "text-green-600",
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <AlertDialogTitle>Subject In Use</AlertDialogTitle>
              <p className="text-sm text-muted-foreground">
                {usage.subject.name} ({usage.subject.code})
              </p>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogDescription className="space-y-4 text-left">
          <p className="text-sm">
            This subject is actively being used in the system:
          </p>

          <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
            {usageItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-foreground">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3">
            <p className="text-sm text-amber-900">
              <strong>Warning:</strong> {changeSummary} might affect reports,
              analytics, and historical records.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Are you sure you want to continue?
          </p>
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
