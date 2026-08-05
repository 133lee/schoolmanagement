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
import { Phone, Mail, ChevronDown, Users, Loader2, X, AlertTriangle } from "lucide-react";
import { Guardian, ParentStatus } from "@/types/prisma-enums";
import { useParents } from "@/hooks/useParents";
import { Badge } from "@/components/ui/badge";
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

interface Student {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  studentNumber: string;
  gender: string;
  status: string;
}

interface GuardianWithRelations extends Guardian {
  studentGuardians?: Array<{
    relationship: string;
    isPrimary: boolean;
    student: Student;
  }>;
}

interface ParentSheetProps {
  parentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ParentSheet({
  parentId,
  open,
  onOpenChange,
}: ParentSheetProps) {
  const { toast } = useToast();
  const [openSection, setOpenSection] = useState<string | null>("about");
  const [parent, setParent] = useState<GuardianWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [studentToUnlink, setStudentToUnlink] = useState<Student & { relationship: string; isPrimary: boolean } | null>(null);
  const { getParent } = useParents();

  useEffect(() => {
    if (!open || !parentId) {
      setParent(null);
      return;
    }

    const fetchParent = async () => {
      try {
        setIsLoading(true);
        const data = await getParent(parentId, true);
        setParent(data as GuardianWithRelations);
      } catch (error) {
        console.error("Failed to fetch parent:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParent();
  }, [open, parentId, getParent]);

  if (!parent) return null;

  const fullName = `${parent.firstName} ${parent.lastName}`;
  const initials = `${parent.firstName[0]}${parent.lastName[0]}`;

  // Get linked students
  const linkedStudents = parent.studentGuardians?.map(sg => ({
    ...sg.student,
    relationship: sg.relationship,
    isPrimary: sg.isPrimary,
  })) || [];

  const formatRelationship = (rel: string) => {
    return rel.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleUnlinkClick = (student: Student & { relationship: string; isPrimary: boolean }) => {
    setStudentToUnlink(student);
    setUnlinkDialogOpen(true);
  };

  const handleUnlinkConfirm = async () => {
    if (!studentToUnlink || !parentId) return;

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

      const response = await fetch(
        `/api/parents/${parentId}/students?studentId=${studentToUnlink.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to unlink student");
      }

      toast({
        title: "Success",
        description: "Student unlinked from guardian successfully",
      });

      // Refresh parent data
      const data = await getParent(parentId, true);
      setParent(data as GuardianWithRelations);
    } catch (error: any) {
      console.error("Error unlinking student:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to unlink student",
        variant: "destructive",
      });
    } finally {
      setUnlinkDialogOpen(false);
      setStudentToUnlink(null);
    }
  };

  const getStatusVariant = (status: ParentStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case ParentStatus.ACTIVE:
        return "default";
      case ParentStatus.INACTIVE:
        return "secondary";
      case ParentStatus.DECEASED:
        return "destructive";
      default:
        return "outline";
    }
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
                    <Badge variant={getStatusVariant(parent.status)}>
                      {parent.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Guardian
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
                {parent.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => (window.location.href = `mailto:${parent.email}`)}>
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
                      Contact Information
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-2">
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground">
                            Phone
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {parent.phone}
                          </p>
                        </div>
                        {parent.email && (
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground">
                              Email
                            </label>
                            <p className="text-sm font-medium mt-0.5 break-all">
                              {parent.email}
                            </p>
                          </div>
                        )}
                        {parent.address && (
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground">
                              Address
                            </label>
                            <p className="text-sm font-medium mt-0.5">
                              {parent.address}
                            </p>
                          </div>
                        )}
                        {parent.occupation && (
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground">
                              Occupation
                            </label>
                            <p className="text-sm font-medium mt-0.5">
                              {parent.occupation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Linked Students - Collapsible */}
                <Collapsible
                  open={openSection === "students"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "students" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Linked Students {linkedStudents.length > 0 && `(${linkedStudents.length})`}
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 max-h-75 overflow-y-auto">
                      {linkedStudents.length > 0 ? (
                        <div className="space-y-4 pt-2">
                          {linkedStudents.map((student) => {
                            const studentFullName = `${student.firstName} ${student.middleName ? student.middleName + " " : ""}${student.lastName}`;
                            const studentInitials = `${student.firstName[0]}${student.lastName[0]}`;

                            return (
                              <div key={student.id} className="border rounded-lg p-3 space-y-3">
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src="" alt={studentFullName} />
                                    <AvatarFallback>
                                      {studentInitials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium">
                                        {studentFullName}
                                      </p>
                                      {student.isPrimary && (
                                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded">
                                          Primary Contact
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {student.studentNumber}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleUnlinkClick(student)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t">
                                  <div>
                                    <label className="text-xs text-muted-foreground">
                                      Relationship
                                    </label>
                                    <p className="text-sm font-medium mt-0.5">
                                      {formatRelationship(student.relationship)}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">
                                      Gender
                                    </label>
                                    <p className="text-sm font-medium mt-0.5">
                                      {student.gender === "MALE" ? "Male" : "Female"}
                                    </p>
                                  </div>
                                  <div className="col-span-2">
                                    <label className="text-xs text-muted-foreground">
                                      Status
                                    </label>
                                    <p className="text-sm font-medium mt-0.5">
                                      {student.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 pt-2">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm text-muted-foreground">
                            No students linked
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

      {/* Unlink Student Confirmation Dialog */}
      <AlertDialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Unlink Student</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-3">
              Are you sure you want to unlink{" "}
              <span className="font-semibold">
                {studentToUnlink?.firstName} {studentToUnlink?.lastName}
              </span>{" "}
              from this guardian? This will remove the parent-child relationship.
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
