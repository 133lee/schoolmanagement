"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ChevronDown, Users, BookOpen, Loader2, Building2, Plus, X } from "lucide-react";
import { Department, DepartmentStatus } from "@/types/prisma-enums";
import { useDepartments } from "@/hooks/useDepartments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddMemberDialog } from "./add-member-dialog";
import { useToast } from "@/hooks/use-toast";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  staffNumber: string;
  qualification: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  teacherSubjects?: Array<{
    teacher: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

interface DepartmentWithRelations extends Department {
  subjects?: Subject[];
  teacherProfiles?: Teacher[];
  hodTeacher?: {
    id: string;
    firstName: string;
    lastName: string;
    staffNumber: string;
    user: {
      email: string;
    };
  } | null;
}

interface DepartmentSheetProps {
  departmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepartmentSheet({
  departmentId,
  open,
  onOpenChange,
}: DepartmentSheetProps) {
  const { toast } = useToast();
  const [openSection, setOpenSection] = useState<string | null>("about");
  const [department, setDepartment] = useState<DepartmentWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const { getDepartment } = useDepartments();

  useEffect(() => {
    if (!open || !departmentId) {
      setDepartment(null);
      return;
    }

    const fetchDepartment = async () => {
      try {
        setIsLoading(true);
        const data = await getDepartment(departmentId, true);
        console.log("[SHEET] fetchDepartment received data - HOD info:", {
          departmentId: data.id,
          departmentName: data.name,
          hodTeacherId: data.hodTeacherId,
          hodTeacher: (data as any).hodTeacher,
        });
        setDepartment(data as DepartmentWithRelations);
      } catch (error) {
        console.error("Failed to fetch department:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartment();
  }, [open, departmentId, getDepartment]);

  if (!department) return null;

  const teachers = department.teacherProfiles || [];
  const subjects = department.subjects || [];

  const getStatusVariant = (status: DepartmentStatus): "default" | "secondary" | "outline" => {
    switch (status) {
      case DepartmentStatus.ACTIVE:
        return "default";
      case DepartmentStatus.INACTIVE:
        return "secondary";
      case DepartmentStatus.ARCHIVED:
        return "outline";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: DepartmentStatus) => {
    return status.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleAddMember = async (data: { teacherIds: string[] }) => {
    try {
      setIsAddingMember(true);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Authentication required");
      }

      // Add teachers to department using the new endpoint
      const response = await fetch(`/api/departments/${departmentId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacherIds: data.teacherIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add members");
      }

      toast({
        title: "Success",
        description: `${data.teacherIds.length} member(s) added to department successfully`,
      });

      setAddMemberDialogOpen(false);

      // Refresh department data
      if (departmentId) {
        const refreshedData = await getDepartment(departmentId, true);
        setDepartment(refreshedData as DepartmentWithRelations);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add members",
        variant: "destructive",
      });
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Remove ${teacherName} from this department?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`/api/departments/${departmentId}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacherId: teacherId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to remove member");
      }

      toast({
        title: "Success",
        description: `${teacherName} removed from department`,
      });

      // Refresh department data
      if (departmentId) {
        const refreshedData = await getDepartment(departmentId, true);
        setDepartment(refreshedData as DepartmentWithRelations);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove member",
        variant: "destructive",
      });
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
                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <SheetTitle className="mb-1">{department.name}</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {department.code}
                  </p>
                </div>
              </div>
            </SheetHeader>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-4">
                {/* About Section */}
                <Collapsible
                  open={openSection === "about"}
                  onOpenChange={() =>
                    setOpenSection(openSection === "about" ? null : "about")
                  }>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">About</span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        openSection === "about" ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-3 px-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Department Code
                      </p>
                      <Badge variant="outline">{department.code}</Badge>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Head of Department
                      </p>
                      {department.hodTeacher ? (
                        <p className="text-sm font-medium">
                          {department.hodTeacher.firstName} {department.hodTeacher.lastName}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not assigned</p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Description
                      </p>
                      <p className="text-sm">
                        {department.description || "No description available"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Status
                      </p>
                      <Badge variant={getStatusVariant(department.status)}>
                        {formatStatus(department.status)}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Created
                      </p>
                      <p className="text-sm">
                        {new Date(department.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Teachers Section */}
                <Collapsible
                  open={openSection === "teachers"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "teachers" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Teachers ({teachers.length})
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 max-h-75 overflow-y-auto">
                      {teachers.length > 0 && (
                        <div className="pt-2 space-y-2">
                          {teachers.map((teacher) => (
                            <div
                              key={teacher.id}
                              className="border rounded-lg p-3 group hover:border-destructive/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {getInitials(teacher.firstName, teacher.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {teacher.firstName} {teacher.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {teacher.staffNumber}
                                  </p>
                                </div>
                                <Badge variant="outline" className="shrink-0">
                                  {teacher.qualification}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemoveMember(teacher.id, `${teacher.firstName} ${teacher.lastName}`)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {teachers.length === 0 && (
                        <div className="text-center py-4 pt-2">
                          <p className="text-sm text-muted-foreground mb-3">
                            No teachers assigned to this department
                          </p>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => setAddMemberDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {teachers.length > 0 ? "Manage Members" : "Add Members"}
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Subjects Section */}
                <Collapsible
                  open={openSection === "subjects"}
                  onOpenChange={() =>
                    setOpenSection(openSection === "subjects" ? null : "subjects")
                  }>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        Subjects ({subjects.length})
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        openSection === "subjects" ? "rotate-180" : ""
                      }`}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2 px-4 max-h-75 overflow-y-auto">
                    {subjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No subjects in this department
                      </p>
                    ) : (
                      subjects.map((subject) => (
                        <div
                          key={subject.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                          <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                            <BookOpen className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {subject.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {subject.code}
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            {subject.teacherSubjects?.length || 0} Teacher(s)
                          </Badge>
                        </div>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>

      {/* Add Member Dialog */}
      {departmentId && (
        <AddMemberDialog
          open={addMemberDialogOpen}
          onOpenChange={setAddMemberDialogOpen}
          onSubmit={handleAddMember}
          isSubmitting={isAddingMember}
          departmentId={departmentId}
        />
      )}
    </Sheet>
  );
}
