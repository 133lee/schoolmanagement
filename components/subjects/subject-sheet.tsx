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
import { ChevronDown, Users, BookOpen, Loader2 } from "lucide-react";
import { Subject } from "@/types/prisma-enums";
import { useSubjects } from "@/hooks/useSubjects";
import { Badge } from "@/components/ui/badge";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  staffNumber: string;
}

interface SubjectWithRelations extends Subject {
  department?: {
    id: string;
    name: string;
  } | null;
  teacherSubjects?: Array<{
    teacher: Teacher;
  }>;
}

interface SubjectSheetProps {
  subjectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubjectSheet({
  subjectId,
  open,
  onOpenChange,
}: SubjectSheetProps) {
  const [openSection, setOpenSection] = useState<string | null>("about");
  const [subject, setSubject] = useState<SubjectWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { getSubject } = useSubjects();

  useEffect(() => {
    if (!open || !subjectId) {
      setSubject(null);
      return;
    }

    const fetchSubject = async () => {
      try {
        setIsLoading(true);
        const data = await getSubject(subjectId, true);
        setSubject(data as SubjectWithRelations);
      } catch (error) {
        console.error("Failed to fetch subject:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubject();
  }, [open, subjectId, getSubject]);

  if (!subject) return null;

  const teachers = subject.teacherSubjects?.map(ts => ts.teacher) || [];

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
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <SheetTitle className="mb-1">{subject.name}</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {subject.code}
                  </p>
                </div>
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
                      Subject Information
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-1 gap-y-4 pt-2">
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Subject Code
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {subject.code}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">
                            Subject Name
                          </label>
                          <p className="text-sm font-medium mt-0.5">
                            {subject.name}
                          </p>
                        </div>
                        {subject.description && (
                          <div>
                            <label className="text-xs text-muted-foreground">
                              Description
                            </label>
                            <p className="text-sm font-medium mt-0.5">
                              {subject.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Department - Collapsible */}
                <Collapsible
                  open={openSection === "department"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "department" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Department
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2">
                      {subject.department ? (
                        <Badge variant="outline" className="text-sm">
                          {subject.department.name}
                        </Badge>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">
                            No department assigned
                          </p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Teachers - Collapsible */}
                <Collapsible
                  open={openSection === "teachers"}
                  onOpenChange={(isOpen) =>
                    setOpenSection(isOpen ? "teachers" : null)
                  }
                  className="border rounded-lg">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Teachers {teachers.length > 0 && `(${teachers.length})`}
                    </h3>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 max-h-75 overflow-y-auto">
                      {teachers.length > 0 ? (
                        <div className="space-y-3 pt-2">
                          {teachers.map((teacher) => {
                            const fullName = `${teacher.firstName} ${teacher.lastName}`;
                            const initials = `${teacher.firstName[0]}${teacher.lastName[0]}`;

                            return (
                              <div key={teacher.id} className="border rounded-lg p-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src="" alt={fullName} />
                                    <AvatarFallback>
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {fullName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {teacher.staffNumber}
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
                            No teachers assigned
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
    </Sheet>
  );
}
