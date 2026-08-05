"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  Users,
  BookOpen,
  Loader2,
  UserCog,
  School,
  UserPlus,
} from "lucide-react";
import { Class, ClassStatus } from "@/types/prisma-enums";
import { useClasses } from "@/hooks/useClasses";
import { Badge } from "@/components/ui/badge";
import { ManageClassTeacherDialog } from "@/components/classes/manage-class-teacher-dialog";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  staffNumber: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface ClassSubjectAssignment {
  subject: Subject;
  teacher?: Teacher | null;
}

interface ClassWithRelations extends Class {
  grade?: {
    id: string;
    name: string;
    level: number;
  } | null;
  students?: Student[];
  classTeacherAssignments?: Array<{
    teacher: Teacher;
  }>;
  classSubjects?: Array<{
    subject: Subject;
    subjectTeacherAssignments?: Array<{ teacher: Teacher }>;
  }>;
}

interface ClassSheetProps {
  classId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChange?: () => void;
  basePath?: string;
}

export function ClassSheet({
  classId,
  open,
  onOpenChange,
  onDataChange,
  basePath = "/admin",
}: ClassSheetProps) {
  const [openSection, setOpenSection] = useState<string | null>("about");
  const [classData, setClassData] = useState<ClassWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [manageTeacherOpen, setManageTeacherOpen] = useState(false);
  const { getClass } = useClasses();

  useEffect(() => {
    if (!open || !classId) {
      setClassData(null);
      return;
    }

    const fetchClass = async () => {
      try {
        setIsLoading(true);
        const data = await getClass(classId, true);
        setClassData(data as ClassWithRelations);
      } catch (error) {
        console.error("Failed to fetch class:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClass();
  }, [open, classId, getClass]);

  if (!classData) return null;

  const students = classData.students || [];
  const classTeacher = classData.classTeacherAssignments?.[0]?.teacher;

  // ✅ Map classSubjects to a flat structure for the UI
  const subjects: ClassSubjectAssignment[] =
    classData.classSubjects?.map((cs) => ({
      subject: cs.subject,
      teacher: cs.subjectTeacherAssignments?.[0]?.teacher ?? null,
    })) || [];

  const getStatusVariant = (
    status: ClassStatus
  ): "default" | "secondary" | "outline" => {
    switch (status) {
      case ClassStatus.ACTIVE:
        return "default";
      case ClassStatus.INACTIVE:
        return "secondary";
      case ClassStatus.ARCHIVED:
        return "outline";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: ClassStatus) => {
    return status.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Header */}
            <SheetHeader className="p-6 pb-4 border-b pt-16 shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <School className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <SheetTitle className="mb-1">{classData.name}</SheetTitle>
                    <Badge variant={getStatusVariant(classData.status)}>
                      {formatStatus(classData.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {classData.grade?.name || "No grade assigned"}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-4"
                onClick={() => {
                  onOpenChange(false);
                  window.location.href = `${basePath}/classes/${classId}/students`;
                }}>
                <Users className="h-4 w-4 mr-2" />
                View Class Students ({classData.currentEnrolled})
              </Button>
            </SheetHeader>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-4">
                {/* About Section */}
                <Collapsible
                  open={openSection === "about"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "about" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Class Information
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-2">
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Class Name
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {classData.name}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Grade Level
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {classData.grade?.name || "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Capacity
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {classData.capacity || "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Current Enrollment
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {classData.currentEnrolled} / {classData.capacity}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Class Teacher */}
                <Collapsible
                  open={openSection === "teacher"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "teacher" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Class Teacher
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      {classTeacher ? (
                        <div className="pt-2">
                          <div className="border rounded-lg p-3 flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src=""
                                alt={`${classTeacher.firstName} ${classTeacher.lastName}`}
                              />
                              <AvatarFallback>
                                {classTeacher.firstName[0]}
                                {classTeacher.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {classTeacher.firstName} {classTeacher.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {classTeacher.staffNumber}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3"
                            onClick={() => setManageTeacherOpen(true)}>
                            <UserCog className="h-4 w-4 mr-2" />
                            Manage Class Teacher
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4 pt-2">
                          <p className="text-sm text-muted-foreground mb-3">
                            No class teacher assigned
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setManageTeacherOpen(true)}>
                            <UserCog className="h-4 w-4 mr-2" />
                            Assign Class Teacher
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Students */}
                <Collapsible
                  open={openSection === "students"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "students" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Students {students.length > 0 && `(${students.length})`}
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      {students.length > 0 ? (
                        <ScrollArea className="h-[300px] pt-2">
                          <div className="space-y-2 pr-4">
                            {students.map((student) => {
                              const initials = `${student.firstName[0]}${student.lastName[0]}`;
                              return (
                                <div
                                  key={student.id}
                                  className="border rounded-lg p-3 flex items-center gap-3">
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage
                                      src=""
                                      alt={`${student.firstName} ${student.lastName}`}
                                    />
                                    <AvatarFallback className="text-xs">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {student.firstName} {student.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {student.studentNumber}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-4 pt-2">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm text-muted-foreground mb-3">
                            No students enrolled
                          </p>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() =>
                          (window.location.href = `${basePath}/classes/${classId}/enroll`)
                        }>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {students.length > 0
                          ? "Enroll More Students"
                          : "Enroll Students"}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Subjects */}
                <Collapsible
                  open={openSection === "subjects"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "subjects" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Subjects {subjects.length > 0 && `(${subjects.length})`}
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 max-h-75 overflow-y-auto">
                      {subjects.length > 0 ? (
                        <div className="space-y-3 pt-2">
                          {subjects.map((assignment) => (
                            <div
                              key={assignment.subject.id}
                              className="border rounded-lg p-3 flex items-start gap-2">
                              <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {assignment.subject.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {assignment.subject.code}
                                </p>
                                {assignment.teacher ? (
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-[10px]">
                                        {assignment.teacher.firstName[0]}
                                        {assignment.teacher.lastName[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <p className="text-xs text-muted-foreground">
                                      {assignment.teacher.firstName}{" "}
                                      {assignment.teacher.lastName}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    No teacher assigned
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 pt-2">
                          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm text-muted-foreground">
                            No subjects assigned
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>

      {classId && (
        <ManageClassTeacherDialog
          open={manageTeacherOpen}
          onOpenChange={setManageTeacherOpen}
          classId={classId}
          className={classData.name}
          currentTeacherId={classTeacher?.id}
          onSuccess={async () => {
            const refreshedData = await getClass(classId, true);
            setClassData(refreshedData as ClassWithRelations);
            onDataChange?.();
          }}
        />
      )}
    </Sheet>
  );
}
