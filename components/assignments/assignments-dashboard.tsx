"use client";

import { useState } from "react";
import {
  Grid3X3,
  Users,
  BookOpen,
  GraduationCap,
  Search,
  PanelRight,
} from "lucide-react";
import { cn, formatClassLabel } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

import { AssignmentMatrix } from "./assignment-matrix";
import { WorkloadPanel } from "./workload-panel";
import { ViewByClass } from "./view-by-class";
import { ViewByTeacher } from "./view-by-teacher";
import { ViewBySubject } from "./view-by-subject";
import { ActivityLog } from "./activity-log";
import { FloatingActions } from "./floating-actions";
import { AssignmentModal } from "./assignment-modal";
import { CurriculumAssignmentModal } from "./curriculum-assignment-modal";
import {
  AssignmentTeacher,
  AssignmentSubject,
  AssignmentClass,
  Assignment,
  ActivityLogItem,
  Term,
  CurriculumItem,
  AssignableTeacher,
} from "./types";
import type { SchoolTerm } from "@/app/(dashboard)/hod/assignments/page";

interface AssignmentsDashboardProps {
  teachers: AssignmentTeacher[];
  subjects: AssignmentSubject[];
  classes: AssignmentClass[];
  assignments: Assignment[];
  activities: ActivityLogItem[];
  terms: Term[];
  currentTermId: string;
  departmentName?: string;
  onAssign: (subjectId: string, classId: string, teacherId: string) => void;
  onTermChange?: (termId: string) => void;
  isLoading?: boolean;
  // Curriculum-based assignment props
  curriculum?: CurriculumItem[];
  assignableTeachers?: AssignableTeacher[];
  onCurriculumAssign?: (classSubjectId: string, teacherId: string) => Promise<void>;
  onCurriculumUnassign?: (assignmentId: string) => Promise<void>;
  schoolTerms?: SchoolTerm[];
}

export function AssignmentsDashboard({
  teachers,
  subjects,
  classes,
  assignments,
  activities,
  terms,
  currentTermId,
  departmentName = "Department",
  onAssign,
  onTermChange,
  isLoading = false,
  curriculum = [],
  assignableTeachers = [],
  onCurriculumAssign,
  onCurriculumUnassign,
  schoolTerms = [],
}: AssignmentsDashboardProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState(currentTermId);
  const [showWorkloadSheet, setShowWorkloadSheet] = useState(false);
  const [activeTab, setActiveTab] = useState("matrix");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [isCurriculumAssigning, setIsCurriculumAssigning] = useState(false);

  // Determine if we should use curriculum-based assignment
  const useCurriculumMode = curriculum.length > 0 && onCurriculumAssign;

  const handleTermChange = (termId: string) => {
    setSelectedTerm(termId);
    onTermChange?.(termId);
  };

  const handleAssign = (
    subjectId: string,
    classId: string,
    teacherId: string
  ) => {
    onAssign(subjectId, classId, teacherId);

    const teacher = teachers.find((t) => t.id === teacherId);
    const subject = subjects.find((s) => s.id === subjectId);
    const cls = classes.find((c) => c.id === classId);

    toast({
      title: "Assignment Updated",
      description: `${teacher?.name} assigned to ${subject?.name} for ${cls?.grade} ${cls?.name}`,
    });
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your report is being generated...",
    });
  };

  // Handler for curriculum-based assignment
  const handleCurriculumAssign = async (classSubjectId: string, teacherId: string) => {
    if (!onCurriculumAssign) return;

    setIsCurriculumAssigning(true);
    try {
      await onCurriculumAssign(classSubjectId, teacherId);

      const curriculumItem = curriculum.find((c) => c.classSubjectId === classSubjectId);
      const teacher = assignableTeachers.find((t) => t.id === teacherId);

      if (curriculumItem && teacher) {
        toast({
          title: "Assignment Updated",
          description: `${teacher.name} assigned to ${curriculumItem.subject.name} for ${formatClassLabel(curriculumItem.class.grade.name, curriculumItem.class.name)}`,
        });
      }
    } catch (error) {
      console.error("Curriculum assignment failed:", error);
      toast({
        title: "Assignment Failed",
        description: error instanceof Error ? error.message : "Failed to assign teacher",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsCurriculumAssigning(false);
    }
  };

  // Handler for curriculum-based unassignment
  const handleCurriculumUnassign = async (assignmentId: string) => {
    if (!onCurriculumUnassign) return;

    const curriculumItem = curriculum.find(
      (c) => c.currentAssignment?.id === assignmentId
    );

    try {
      await onCurriculumUnassign(assignmentId);

      toast({
        title: "Teacher Unassigned",
        description: curriculumItem?.currentAssignment
          ? `${curriculumItem.currentAssignment.teacher.name} removed from ${curriculumItem.subject.name} for ${formatClassLabel(curriculumItem.class.grade.name, curriculumItem.class.name)}`
          : "The assignment has been removed.",
      });
    } catch (error) {
      console.error("Curriculum unassignment failed:", error);
      toast({
        title: "Unassign Failed",
        description: error instanceof Error ? error.message : "Failed to unassign teacher",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handler for opening the appropriate assign modal
  const handleOpenAssignModal = () => {
    if (useCurriculumMode) {
      setShowCurriculumModal(true);
    } else {
      setShowAssignModal(true);
    }
  };

  // Filter data based on search
  const filteredClasses = classes.filter(
    (cls) =>
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.grade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats for header cards
  const stats = {
    totalAssignments: assignments.length,
    assignedCount: assignments.filter((a) => a.teacherId).length,
    unassignedCount: assignments.filter((a) => !a.teacherId).length,
    teacherCount: teachers.length,
  };

  return (
    <TooltipProvider>
      <div className="bg-background">
        {/* Main Content — header, stats, and the tabbed card all live in the
            same padded wrapper now so their outer edges line up exactly
            (they used to be full-bleed bands wider than the card below). */}
        <main className="flex-1">
          <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
            {/* Header — not sticky: the surrounding dashboard layout (desktop
                sidebar header / mobile top bar) already provides sticky page
                chrome, so this used to double up and visually overlap it. */}
            <header className="bg-card border border-border rounded-xl">
              <div className="px-4 py-4 lg:px-6">
                <div className="hidden lg:flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                      Teaching Assignments
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      {departmentName} • Manage teacher-subject-class assignments
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 lg:flex-wrap lg:items-center lg:gap-3">
                  <div className="relative flex-1 lg:min-w-[280px] lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={selectedTerm} onValueChange={handleTermChange}>
                    <SelectTrigger className="w-fit lg:w-[180px]">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {terms.map((term) => (
                        <SelectItem key={term.id} value={term.id}>
                          {term.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </header>

            {/* Stats Cards */}
            <div className="rounded-xl border border-border bg-secondary/30 px-4 py-4 lg:px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Total Assignments"
                  value={stats.totalAssignments}
                  icon={Grid3X3}
                  color="primary"
                />
                <StatCard
                  label="Assigned"
                  value={stats.assignedCount}
                  icon={GraduationCap}
                  color="success"
                />
                <StatCard
                  label="Unassigned"
                  value={stats.unassignedCount}
                  icon={BookOpen}
                  color="destructive"
                />
                <StatCard
                  label="Teachers"
                  value={stats.teacherCount}
                  icon={Users}
                  color="accent"
                />
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <TabsList className="bg-secondary/50">
                  <TabsTrigger
                    value="matrix"
                    className="data-[state=active]:bg-card"
                    title="Matrix View"
                  >
                    <Grid3X3 className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">Matrix View</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="class"
                    className="data-[state=active]:bg-card"
                    title="By Class"
                  >
                    <GraduationCap className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">By Class</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="teacher"
                    className="data-[state=active]:bg-card"
                    title="By Teacher"
                  >
                    <Users className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">By Teacher</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="subject"
                    className="data-[state=active]:bg-card"
                    title="By Subject"
                  >
                    <BookOpen className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">By Subject</span>
                  </TabsTrigger>
                </TabsList>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWorkloadSheet(true)}
                  title="Workload & Activity"
                >
                  <PanelRight className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">Workload & Activity</span>
                </Button>
              </div>

              <Card className="border-border">
                <TabsContent value="matrix" className="m-0">
                  <AssignmentMatrix
                    subjects={searchQuery ? filteredSubjects : subjects}
                    classes={searchQuery ? filteredClasses : classes}
                    teachers={teachers}
                    assignments={assignments}
                    onAssign={handleAssign}
                    onUnassign={
                      onCurriculumUnassign ? handleCurriculumUnassign : undefined
                    }
                    isLoading={isLoading}
                  />
                </TabsContent>

                <TabsContent value="class" className="m-0 p-4">
                  <ViewByClass
                    classes={searchQuery ? filteredClasses : classes}
                    subjects={subjects}
                    teachers={teachers}
                    assignments={assignments}
                  />
                </TabsContent>

                <TabsContent value="teacher" className="m-0 p-4">
                  <ViewByTeacher
                    teachers={searchQuery ? filteredTeachers : teachers}
                    subjects={subjects}
                    classes={classes}
                    assignments={assignments}
                  />
                </TabsContent>

                <TabsContent value="subject" className="m-0 p-4">
                  <ViewBySubject
                    subjects={searchQuery ? filteredSubjects : subjects}
                    classes={classes}
                    teachers={teachers}
                    assignments={assignments}
                  />
                </TabsContent>
              </Card>
            </Tabs>
          </div>
        </main>

        {/* Workload & Activity Sheet */}
        <Sheet open={showWorkloadSheet} onOpenChange={setShowWorkloadSheet}>
          <SheetContent className="w-full sm:max-w-[520px] p-0 flex flex-col overflow-hidden">
            <SheetHeader className="px-5 py-4 border-b shrink-0">
              <SheetTitle className="text-base">Workload & Activity</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {departmentName} — {teachers.length} teachers
              </p>
            </SheetHeader>
            <Tabs defaultValue="workload" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-5 mt-3 mb-0 bg-muted/60 shrink-0">
                <TabsTrigger value="workload" className="flex-1 text-xs data-[state=active]:bg-background">
                  Workload
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex-1 text-xs data-[state=active]:bg-background">
                  Activity
                  {activities.length > 0 && (
                    <span className="ml-1.5 bg-primary/15 text-primary text-[10px] font-bold rounded-full px-1.5 py-0.5 tabular-nums">
                      {activities.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="workload" className="flex-1 mt-3 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
                <WorkloadPanel teachers={teachers} />
              </TabsContent>
              <TabsContent value="activity" className="flex-1 mt-3 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col">
                <ActivityLog activities={activities} schoolTerms={schoolTerms} />
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>

        {/* Floating Action Buttons */}
        <FloatingActions
          onAssignClick={handleOpenAssignModal}
          onExportClick={handleExport}
        />

        {/* Modals */}
        <AssignmentModal
          open={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          subjects={subjects}
          classes={classes}
          teachers={teachers}
          onAssign={handleAssign}
        />

        {/* Curriculum-based Assignment Modal */}
        {useCurriculumMode && (
          <CurriculumAssignmentModal
            open={showCurriculumModal}
            onClose={() => setShowCurriculumModal(false)}
            curriculum={curriculum}
            teachers={assignableTeachers}
            onAssign={handleCurriculumAssign}
            onUnassign={onCurriculumUnassign ? handleCurriculumUnassign : undefined}
            isLoading={isCurriculumAssigning}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "primary" | "success" | "destructive" | "accent";
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-500",
    destructive: "bg-destructive/10 text-destructive",
    accent: "bg-blue-500/10 text-blue-500",
  };

  return (
    <div className="bg-card rounded-lg border border-border p-3 lg:p-4 transition-all hover:shadow-sm">
      {/* ── Mobile: label + icon share row one, value on its own row ── */}
      <div className="flex flex-col gap-1.5 lg:hidden">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", colorClasses[color])}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>

      {/* ── Desktop: original single-row layout ── */}
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center",
            colorClasses[color]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
