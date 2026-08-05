"use client";

import { useState, useEffect } from "react";
import { formatClassLabel } from "@/lib/utils";
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
import { Phone, Mail, ChevronDown, BookOpen, Loader2, Users, X, AlertTriangle } from "lucide-react";
import { TeacherProfile, StaffStatus } from "@/types/prisma-enums";
import { useTeachers } from "@/hooks/useTeachers";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
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

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface ClassAssignment {
  id: string;
  class: {
    id: string;
    name: string;
    section: string;
    grade: {
      name: string;
    };
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  academicYear: {
    id: string;
    year: number;
    isActive: boolean;
  };
}

interface TeacherWithRelations extends TeacherProfile {
  departments?: Array<{
    department: {
      id: string;
      name: string;
      code: string;
    };
    isPrimary: boolean;
  }>;
  subjects?: Array<{
    subject: Subject;
  }>;
  user?: {
    email: string;
  } | null;
}

interface TeacherSheetProps {
  teacherId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeacherSheet({
  teacherId,
  open,
  onOpenChange,
}: TeacherSheetProps) {
  const { toast } = useToast();
  const [openSection, setOpenSection] = useState<string | null>("about");
  const [teacher, setTeacher] = useState<TeacherWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [assignmentToUnlink, setAssignmentToUnlink] = useState<ClassAssignment | null>(null);
  const { getTeacher } = useTeachers();

  useEffect(() => {
    if (!open || !teacherId) {
      setTeacher(null);
      setAssignments([]);
      return;
    }

    const fetchTeacher = async () => {
      try {
        setIsLoading(true);
        const data = await getTeacher(teacherId, true);
        setTeacher(data as TeacherWithRelations);
      } catch (error) {
        console.error("Failed to fetch teacher:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchAssignments = async () => {
      try {
        setAssignmentsLoading(true);
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const response = await fetch(`/api/teachers/${teacherId}/assignments`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAssignments(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch assignments:", error);
      } finally {
        setAssignmentsLoading(false);
      }
    };

    fetchTeacher();
    fetchAssignments();
  }, [open, teacherId, getTeacher]);

  const handleUnlinkClick = (assignment: ClassAssignment) => {
    setAssignmentToUnlink(assignment);
    setUnlinkDialogOpen(true);
  };

  const handleUnlinkConfirm = async () => {
    if (!assignmentToUnlink) return;

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/assignments/${assignmentToUnlink.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unlink assignment");
      }

      toast({
        title: "Success",
        description: "Assignment unlinked successfully",
      });

      // Refresh assignments
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentToUnlink.id));
    } catch (error: any) {
      console.error("Error unlinking assignment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to unlink assignment",
        variant: "destructive",
      });
    } finally {
      setUnlinkDialogOpen(false);
      setAssignmentToUnlink(null);
    }
  };

  if (!teacher) return null;

  const fullName = `${teacher.firstName} ${teacher.middleName ? teacher.middleName + " " : ""}${teacher.lastName}`;
  const initials = `${teacher.firstName[0]}${teacher.lastName[0]}`;

  const subjects = teacher.subjects?.map(ts => ts.subject) || [];

  const getStatusVariant = (status: StaffStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case StaffStatus.ACTIVE:
        return "default";
      case StaffStatus.ON_LEAVE:
        return "outline";
      case StaffStatus.SUSPENDED:
        return "secondary";
      case StaffStatus.TERMINATED:
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: StaffStatus) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
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
                <Avatar className="h-16 w-16">
                  <AvatarImage src="" alt={fullName} />
                  <AvatarFallback className="text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <SheetTitle className="mb-1">{fullName}</SheetTitle>
                    <Badge variant={getStatusVariant(teacher.status)}>
                      {formatStatus(teacher.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {teacher.staffNumber}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                {teacher.user?.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => (window.location.href = `mailto:${teacher.user?.email}`)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                )}
              </div>
            </SheetHeader>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-4">
                {/* About - Collapsible */}
                <Collapsible
                  open={openSection === "about"}
                  onOpenChange={(isOpen) => setOpenSection(isOpen ? "about" : null)}
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Personal Information
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-2">
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Staff Number
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {teacher.staffNumber}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Gender
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {teacher.gender === "MALE" ? "Male" : "Female"}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Date of Birth
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {format(new Date(teacher.dateOfBirth), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Hire Date
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {format(new Date(teacher.hireDate), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Qualification
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {teacher.qualification.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                        {teacher.yearsExperience !== null && (
                          <div>
                            <label className="text-xs text-muted-foreground">
                              Experience
                            </label>
                            <p className="text-sm font-medium mt-0.5">
                              {teacher.yearsExperience} years
                            </p>
                          </div>
                        )}
                        {teacher.address && (
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground">
                              Address
                            </label>
                            <p className="text-sm font-medium mt-0.5">
                              {teacher.address}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Contact Information - Collapsible */}
                <Collapsible
                  open={openSection === "contact"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "contact" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Contact Information
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-1 gap-y-4 pt-2">
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Phone
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {teacher.phone}
                          </p>
                        </div>
                        {teacher.user?.email && (
                          <div>
                            <label className="text-xs text-muted-foreground">
                              Email
                            </label>
                            <p className="text-sm font-medium mt-0.5 break-all">
                              {teacher.user.email}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Departments - Collapsible */}
                <Collapsible
                  open={openSection === "department"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "department" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Departments {teacher.departments && teacher.departments.length > 0 && `(${teacher.departments.length})`}
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2">
                      {teacher.departments && teacher.departments.length > 0 ? (
                        <div className="space-y-2">
                          {teacher.departments.map((td) => (
                            <div key={td.department.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                              <div>
                                <p className="text-sm font-medium">
                                  {td.department.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {td.department.code}
                                </p>
                              </div>
                              {td.isPrimary && (
                                <Badge variant="default" className="text-xs">
                                  Primary
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">
                            No departments assigned
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Subjects - Collapsible */}
                <Collapsible
                  open={openSection === "subjects"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "subjects" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Qualified to Teach {subjects.length > 0 && `(${subjects.length})`}
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 max-h-75 overflow-y-auto">
                      {subjects.length > 0 ? (
                        <div className="space-y-3 pt-2">
                          {subjects.map((subject) => (
                            <div key={subject.id} className="border rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {subject.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {subject.code}
                                  </p>
                                </div>
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

                {/* Class Assignments - Collapsible */}
                <Collapsible
                  open={openSection === "assignments"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "assignments" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Class Assignments {assignments.length > 0 && `(${assignments.length})`}
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 max-h-75 overflow-y-auto">
                      {assignmentsLoading ? (
                        <div className="flex items-center justify-center py-4 pt-2">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : assignments.length > 0 ? (
                        <div className="space-y-3 pt-2">
                          {assignments.map((assignment) => (
                            <div key={assignment.id} className="border rounded-lg p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 flex-1">
                                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {formatClassLabel(assignment.class.grade.name, assignment.class.section)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {assignment.subject.name} ({assignment.subject.code})
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {assignment.academicYear.year} {assignment.academicYear.isActive && "(Active)"}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleUnlinkClick(assignment)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 pt-2">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm text-muted-foreground">
                            No class assignments
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

      {/* Unlink Assignment Confirmation Dialog */}
      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Unlink Assignment</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-3">
              Are you sure you want to unlink{" "}
              <span className="font-semibold">
                {assignmentToUnlink ? formatClassLabel(assignmentToUnlink.class.grade.name, assignmentToUnlink.class.section) : ""}
              </span>{" "}
              -{" "}
              <span className="font-semibold">
                {assignmentToUnlink?.subject.name}
              </span>{" "}
              from this teacher? This will remove the teacher's assignment to teach this subject for this class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlinkConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
