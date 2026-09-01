"use client";

import { useState, useMemo } from "react";
import { formatClassLabel, formatCompactClassLabel } from "@/lib/utils";
import { AlertTriangle, CheckCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CurriculumItem,
  AssignableTeacher,
  getSubjectColor,
} from "./types";

interface CurriculumAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  curriculum: CurriculumItem[];
  teachers: AssignableTeacher[];
  onAssign: (classSubjectId: string, teacherId: string) => Promise<void>;
  onUnassign?: (assignmentId: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * CurriculumAssignmentModal - ClassSubject-based teacher assignment
 *
 * This modal ensures teachers can ONLY be assigned to subjects that
 * exist in the class curriculum (ClassSubject). This prevents invalid
 * assignments at the UI level.
 *
 * Key differences from the old modal:
 * 1. Single dropdown for ClassSubject (combined subject + class)
 * 2. Impossible to select non-curriculum subjects
 * 3. Shows current assignment if exists
 * 4. Groups by class for better UX
 */
export function CurriculumAssignmentModal({
  open,
  onClose,
  curriculum,
  teachers,
  onAssign,
  onUnassign,
  isLoading,
}: CurriculumAssignmentModalProps) {
  const [selectedCurriculumId, setSelectedCurriculumId] = useState<string>("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);

  // Get the selected curriculum item
  const selectedCurriculum = useMemo(
    () => curriculum.find((c) => c.classSubjectId === selectedCurriculumId),
    [curriculum, selectedCurriculumId]
  );

  // Get the selected teacher
  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId),
    [teachers, selectedTeacherId]
  );

  // Filter teachers based on qualifications (if available)
  const availableTeachers = useMemo(() => {
    if (!selectedCurriculum) return teachers;

    return teachers.filter((t) => {
      // If teacher has qualified subjects list, check it
      if (t.qualifiedSubjectIds && t.qualifiedSubjectIds.length > 0) {
        return t.qualifiedSubjectIds.includes(selectedCurriculum.subject.id);
      }
      // Otherwise, show all teachers
      return true;
    });
  }, [teachers, selectedCurriculum]);

  // Calculate if assignment would exceed workload
  const wouldExceedWorkload = useMemo(() => {
    if (!selectedTeacher || !selectedCurriculum) return false;
    const newTotal =
      selectedTeacher.currentPeriodsPerWeek + selectedCurriculum.periodsPerWeek;
    return newTotal > selectedTeacher.maxPeriodsPerWeek;
  }, [selectedTeacher, selectedCurriculum]);

  // Group curriculum by class for better dropdown UX
  const curriculumByClass = useMemo(() => {
    const grouped = new Map<string, CurriculumItem[]>();
    curriculum.forEach((item) => {
      const key = formatCompactClassLabel(item.class.grade.name, item.class.name);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    });
    return grouped;
  }, [curriculum]);

  const handleAssign = async () => {
    if (!selectedCurriculumId || !selectedTeacherId) return;

    setIsSubmitting(true);
    try {
      await onAssign(selectedCurriculumId, selectedTeacherId);
      handleClose();
    } catch (error) {
      console.error("Assignment failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCurriculumId("");
    setSelectedTeacherId("");
    onClose();
  };

  const handleUnassignConfirm = async () => {
    if (!onUnassign || !selectedCurriculum?.currentAssignment) return;

    setIsUnassigning(true);
    try {
      await onUnassign(selectedCurriculum.currentAssignment.id);
      setSelectedTeacherId("");
    } catch (error) {
      console.error("Unassign failed:", error);
    } finally {
      setIsUnassigning(false);
      setShowUnassignConfirm(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Assign Teacher to Curriculum
          </DialogTitle>
          <DialogDescription>
            Select a class subject from the curriculum, then assign a teacher.
            Only subjects in the class curriculum are available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Curriculum Item Selection */}
          <div className="space-y-2">
            <Label htmlFor="curriculum">Class Subject (Curriculum)</Label>
            <Select
              value={selectedCurriculumId}
              onValueChange={setSelectedCurriculumId}
              disabled={isLoading}
            >
              <SelectTrigger id="curriculum">
                <SelectValue placeholder="Select from curriculum" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Array.from(curriculumByClass.entries()).map(
                  ([className, items]) => (
                    <div key={className}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted sticky top-0">
                        {className}
                      </div>
                      {items.map((item) => (
                        <SelectItem
                          key={item.classSubjectId}
                          value={item.classSubjectId}
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor: getSubjectColor(
                                    item.subject.name
                                  ),
                                }}
                              />
                              <span>{item.subject.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({item.subject.code})
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {item.isCore && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1"
                                >
                                  Core
                                </Badge>
                              )}
                              {item.currentAssignment ? (
                                <span className="text-xs text-muted-foreground">
                                  ({item.currentAssignment.teacher.name})
                                </span>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1 text-amber-600 border-amber-300"
                                >
                                  Unassigned
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  )
                )}
              </SelectContent>
            </Select>

            {/* Show selected curriculum details */}
            {selectedCurriculum && (
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <span>{selectedCurriculum.periodsPerWeek} periods/week</span>
                <span>•</span>
                <span>
                  {selectedCurriculum.isCore ? "Core subject" : "Elective"}
                </span>
              </div>
            )}
          </div>

          {/* Teacher Selection */}
          <div className="space-y-2">
            <Label htmlFor="teacher">Teacher</Label>
            <Select
              value={selectedTeacherId}
              onValueChange={setSelectedTeacherId}
              disabled={!selectedCurriculumId || isLoading}
            >
              <SelectTrigger id="teacher">
                <SelectValue
                  placeholder={
                    selectedCurriculumId
                      ? "Select teacher"
                      : "Select class subject first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableTeachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{teacher.name}</span>
                      <span
                        className={`text-xs ml-2 ${
                          teacher.isOverloaded
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {teacher.currentPeriodsPerWeek}/
                        {teacher.maxPeriodsPerWeek} periods
                        {teacher.isOverloaded && " (Full)"}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {availableTeachers.length === 0 && (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    No qualified teachers available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Workload Warning */}
          {wouldExceedWorkload && selectedTeacher && selectedCurriculum && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-600">Workload Warning</p>
                <p className="text-yellow-600/80">
                  This assignment would give {selectedTeacher.name}{" "}
                  {selectedTeacher.currentPeriodsPerWeek +
                    selectedCurriculum.periodsPerWeek}{" "}
                  periods, exceeding their maximum of{" "}
                  {selectedTeacher.maxPeriodsPerWeek}.
                </p>
              </div>
            </div>
          )}

          {/* Already Assigned Info */}
          {selectedCurriculum?.currentAssignment && (
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-600 flex-1">
                <p>
                  Currently assigned to:{" "}
                  <strong>
                    {selectedCurriculum.currentAssignment.teacher.name}
                  </strong>
                  . Picking a different teacher below will replace the existing
                  assignment, or you can remove it entirely.
                </p>
                {onUnassign && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setShowUnassignConfirm(true)}
                    disabled={isUnassigning || isSubmitting}
                  >
                    {isUnassigning ? "Unassigning..." : "Unassign Teacher"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              !selectedCurriculumId || !selectedTeacherId || isSubmitting
            }
          >
            {isSubmitting ? "Assigning..." : "Assign Teacher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Unassign Confirmation */}
    <AlertDialog open={showUnassignConfirm} onOpenChange={setShowUnassignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCurriculum?.currentAssignment && (
                <>
                  Remove{" "}
                  <strong>{selectedCurriculum.currentAssignment.teacher.name}</strong>{" "}
                  from teaching {selectedCurriculum.subject.name}
                  {selectedCurriculum &&
                    ` for ${formatClassLabel(selectedCurriculum.class.grade.name, selectedCurriculum.class.name)}`}
                  ? This can be undone by assigning a teacher again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnassigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnassignConfirm}
              disabled={isUnassigning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnassigning ? "Unassigning..." : "Unassign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
