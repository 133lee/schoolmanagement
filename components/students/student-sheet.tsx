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
import { Phone, Mail, ChevronDown, Users, Loader2 } from "lucide-react";
import { Student, Gender, StudentStatus, VulnerabilityStatus, OrphanType, DeceasedParent } from "@/types/prisma-enums";
import { useStudents } from "@/hooks/useStudents";
import { format } from "date-fns";

interface Guardian {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  occupation: string | null;
  address: string | null;
  status: string;
  relationship: string;
  isPrimary: boolean;
}

interface StudentWithRelations extends Student {
  enrollments?: Array<{
    class: {
      id: string;
      name: string;
      grade: {
        id: string;
        name: string;
      };
    };
  }>;
  studentGuardians?: Array<{
    relationship: string;
    isPrimary: boolean;
    guardian: Guardian;
  }>;
}

interface StudentSheetProps {
  studentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentSheet({
  studentId,
  open,
  onOpenChange,
}: StudentSheetProps) {
  const [openSection, setOpenSection] = useState<string | null>("about");
  const [student, setStudent] = useState<StudentWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { getStudent } = useStudents();

  useEffect(() => {
    if (!open || !studentId) {
      setStudent(null);
      return;
    }

    const fetchStudent = async () => {
      try {
        setIsLoading(true);
        const data = await getStudent(studentId, true);
        setStudent(data as StudentWithRelations);
      } catch (error) {
        console.error("Failed to fetch student:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudent();
  }, [open, studentId, getStudent]);

  if (!student) return null;

  const fullName = `${student.firstName} ${student.middleName ? student.middleName + " " : ""}${student.lastName}`;
  const initials = `${student.firstName[0]}${student.lastName[0]}`;

  // Get current enrollment
  const currentEnrollment = student.enrollments?.find(e => true); // Get first active enrollment
  const className = currentEnrollment?.class.name || "Not enrolled";
  const gradeName = currentEnrollment?.class.grade.name || "";

  // Get guardians
  const guardians = student.studentGuardians?.map(sg => ({
    ...sg.guardian,
    relationship: sg.relationship,
    isPrimary: sg.isPrimary,
  })) || [];

  const primaryGuardian = guardians.find(g => g.isPrimary) || guardians[0];

  // Calculate age
  const age = Math.floor(
    (new Date().getTime() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  const formatRelationship = (rel: string) => {
    return rel.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatVulnerability = (status: VulnerabilityStatus) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatOrphanType = (type: OrphanType) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDeceasedParent = (parent: DeceasedParent) => {
    return parent.charAt(0) + parent.slice(1).toLowerCase();
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
                    <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-md whitespace-nowrap">
                      {className}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {student.studentNumber}
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
                  Call Guardian
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => primaryGuardian?.email && (window.location.href = `mailto:${primaryGuardian.email}`)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
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
                      About
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-2">
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Student Number
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {student.studentNumber}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Gender
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {student.gender === Gender.MALE ? "Male" : "Female"}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Date of Birth
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {format(new Date(student.dateOfBirth), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Age
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {age} years
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Admission Date
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {format(new Date(student.admissionDate), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Status
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {student.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                        {student.address && (
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground">
                              Address
                            </label>
                            <p className="text-sm font-medium mt-0.5">
                              {student.address}
                            </p>
                          </div>
                        )}
                        {student.medicalInfo && (
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground">
                              Medical Information
                            </label>
                            <p className="text-sm font-medium mt-0.5">
                              {student.medicalInfo}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Guardians - Collapsible */}
                <Collapsible
                  open={openSection === "guardian"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "guardian" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Guardians {guardians.length > 0 && `(${guardians.length})`}
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 max-h-75 overflow-y-auto">
                      {guardians.length > 0 ? (
                        <div className="space-y-4 pt-2">
                          {guardians.map((guardian) => (
                            <div key={guardian.id} className="border rounded-lg p-3 space-y-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src="" alt={`${guardian.firstName} ${guardian.lastName}`} />
                                  <AvatarFallback>
                                    {guardian.firstName[0]}{guardian.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">
                                      {guardian.firstName} {guardian.lastName}
                                    </p>
                                    {guardian.isPrimary && (
                                      <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded">
                                        Primary
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {formatRelationship(guardian.relationship)}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t">
                                <div className="col-span-2">
                                  <label className="text-xs text-muted-foreground">
                                    Phone
                                  </label>
                                  <p className="text-sm font-medium mt-0.5">
                                    {guardian.phone}
                                  </p>
                                </div>
                                {guardian.email && (
                                  <div className="col-span-2">
                                    <label className="text-xs text-muted-foreground">
                                      Email
                                    </label>
                                    <p className="text-sm font-medium mt-0.5 break-all">
                                      {guardian.email}
                                    </p>
                                  </div>
                                )}
                                {guardian.occupation && (
                                  <div>
                                    <label className="text-xs text-muted-foreground">
                                      Occupation
                                    </label>
                                    <p className="text-sm font-medium mt-0.5">
                                      {guardian.occupation}
                                    </p>
                                  </div>
                                )}
                                {guardian.address && (
                                  <div className="col-span-2">
                                    <label className="text-xs text-muted-foreground">
                                      Address
                                    </label>
                                    <p className="text-sm font-medium mt-0.5">
                                      {guardian.address}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 pt-2">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm text-muted-foreground">
                            No guardians linked
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Vulnerability Status - Collapsible */}
                <Collapsible
                  open={openSection === "vulnerability"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "vulnerability" : null)
                  }
                  className={`border rounded-lg ${
                    student.vulnerability !== VulnerabilityStatus.NOT_VULNERABLE
                      ? "bg-amber-50 border-amber-200"
                      : ""
                  }`}>
                  <CollapsibleTrigger className={`flex items-center justify-between w-full p-4 transition-colors ${
                    student.vulnerability !== VulnerabilityStatus.NOT_VULNERABLE
                      ? "hover:bg-amber-100/50"
                      : "hover:bg-muted/50"
                  }`}>
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${
                      student.vulnerability !== VulnerabilityStatus.NOT_VULNERABLE
                        ? "text-amber-900"
                        : "text-muted-foreground"
                    }`}>
                      Vulnerability Status
                    </h3>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180 ${
                      student.vulnerability !== VulnerabilityStatus.NOT_VULNERABLE
                        ? "text-amber-900"
                        : "text-muted-foreground"
                    }`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3 pt-2">
                      <div>
                        <label className={`text-xs font-semibold ${
                          student.vulnerability !== VulnerabilityStatus.NOT_VULNERABLE
                            ? "text-amber-900"
                            : "text-muted-foreground"
                        }`}>
                          Status
                        </label>
                        <p className={`text-sm font-medium mt-0.5 ${
                          student.vulnerability !== VulnerabilityStatus.NOT_VULNERABLE
                            ? "text-amber-900"
                            : ""
                        }`}>
                          {formatVulnerability(student.vulnerability)}
                        </p>
                      </div>

                      {/* Show orphan details if vulnerability is ORPHAN */}
                      {student.vulnerability === VulnerabilityStatus.ORPHAN && student.orphanType && (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-amber-900">
                              Orphan Classification
                            </label>
                            <p className="text-sm font-medium mt-0.5 text-amber-900">
                              {formatOrphanType(student.orphanType)}
                            </p>
                          </div>

                          {student.orphanType === OrphanType.SINGLE_ORPHAN && student.deceasedParent && (
                            <div>
                              <label className="text-xs font-semibold text-amber-900">
                                Deceased Parent
                              </label>
                              <p className="text-sm font-medium mt-0.5 text-amber-900">
                                {formatDeceasedParent(student.deceasedParent)}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
