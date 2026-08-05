"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AssignmentSubject,
  AssignmentClass,
  AssignmentTeacher,
  getSubjectColor,
} from "./types";

interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  subjects: AssignmentSubject[];
  classes: AssignmentClass[];
  teachers: AssignmentTeacher[];
  onAssign: (subjectId: string, classId: string, teacherId: string) => void;
}

export function AssignmentModal({
  open,
  onClose,
  subjects,
  classes,
  teachers,
  onAssign,
}: AssignmentModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");

  const handleAssign = () => {
    if (selectedSubject && selectedClass && selectedTeacher) {
      onAssign(selectedSubject, selectedClass, selectedTeacher);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedSubject("");
    setSelectedClass("");
    setSelectedTeacher("");
    onClose();
  };

  const selectedTeacherData = teachers.find((t) => t.id === selectedTeacher);
  const isOverloaded =
    selectedTeacherData &&
    selectedTeacherData.periodsPerWeek >= selectedTeacherData.maxPeriods;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Assign Teacher
          </DialogTitle>
          <DialogDescription>
            Create a new teaching assignment for a subject and class.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            subject.color || getSubjectColor(subject.name),
                        }}
                      />
                      {subject.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="class">Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger id="class">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.grade} {cls.name} (Section {cls.section})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher">Teacher</Label>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger id="teacher">
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => {
                  const isTeacherOverloaded =
                    teacher.periodsPerWeek >= teacher.maxPeriods;
                  return (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{teacher.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {teacher.periodsPerWeek}/{teacher.maxPeriods} periods
                          {isTeacherOverloaded && (
                            <span className="text-destructive ml-1">(Full)</span>
                          )}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {isOverloaded && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-600">
                This teacher is already at full capacity. Assigning more classes
                may impact teaching quality.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedSubject || !selectedClass || !selectedTeacher}
          >
            Assign Teacher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
