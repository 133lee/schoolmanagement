"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  GraduationCap,
  RefreshCw,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Gender,
  StudentStatus,
  VulnerabilityStatus,
} from "@/types/prisma-enums";
import { StudentSheet } from "@/components/students/student-sheet";
import { useTeacherStudents } from "@/hooks/useTeacherStudents";
import { StudentPerformanceRadar } from "@/components/teacher/student-performance-radar";
import { StudentClassRankings } from "@/components/teacher/student-class-rankings";
import { StudentSubjectPerformance } from "@/components/teacher/student-subject-performance";
import { useStudentPerformance } from "@/hooks/useStudentPerformance";
import { useSubjectPerformance } from "@/hooks/useSubjectPerformance";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Student {
  id: string;
  studentNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: Date;
  status: StudentStatus;
  vulnerability: VulnerabilityStatus | null;
  hasGuardian: boolean;
  guardianName: string | null;
}

interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  gradeLevel: string;
  subject?: string;
  subjectId?: string;
  subjectCode?: string;
  capacity: number;
  enrolled: number;
  students?: Student[];
}

interface ClassTeacherData {
  view: "class-teacher";
  class: ClassInfo | null;
  students: Student[];
}

interface SubjectTeacherData {
  view: "subject-teacher";
  classes: ClassInfo[];
  selectedClassId: string | null;
}

type TeacherStudentsData = ClassTeacherData | SubjectTeacherData;

export default function TeacherStudentsPage() {
  const { toast } = useToast();
  const [view, setView] = useState<"class-teacher" | "subject-teacher">(
    "class-teacher"
  );
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStudentId, setSheetStudentId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<
    string | null
  >(null);
  const [assessmentFilter, setAssessmentFilter] = useState<
    "CAT1" | "MID" | "EOT"
  >("CAT1");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectTeacherPage, setSubjectTeacherPage] = useState(1);
  const subjectTeacherPageSize = 10;
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  // Use the hook for student list
  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useTeacherStudents(view, selectedClassId, {}, { page, pageSize });

  // Use the hook for student performance (Class Teacher view)
  const {
    data: performanceData,
    loading: performanceLoading,
    error: performanceError,
    refetch: refetchPerformance,
  } = useStudentPerformance(selectedStudentForDetail, assessmentFilter);

  // Use the hook for subject performance (Subject Teacher view)
  // Gate the hook so it NEVER fires with invalid state
  // CRITICAL: Require BOTH subject AND a specific class (not "all")
  // Subject teaching is per-class, not global per subject
  const shouldFetchSubjectPerformance =
    view === "subject-teacher" &&
    !!selectedSubjectId &&
    !!selectedClassId &&
    selectedClassId !== "all";

  const {
    data: subjectPerformanceData,
    loading: subjectPerformanceLoading,
    error: subjectPerformanceError,
    refetch: refetchSubjectPerformance,
  } = useSubjectPerformance(
    shouldFetchSubjectPerformance ? selectedSubjectId : null,
    shouldFetchSubjectPerformance ? selectedClassId : null
  );

  const handleRefresh = () => {
    toast({
      title: "Refreshing",
      description: "Updating student list...",
    });
    refetch();
    if (selectedStudentForDetail) {
      refetchPerformance();
    }
  };

  // Note: Performance errors are now handled inline in the UI cards
  // No need for destructive toast - we show friendly empty states instead

  // Show error toast if subject performance fetch fails
  // Only show error if we should actually be fetching subject performance
  useEffect(() => {
    if (subjectPerformanceError && shouldFetchSubjectPerformance) {
      toast({
        title: "Error loading subject performance",
        description: subjectPerformanceError,
        variant: "destructive",
      });
    }
  }, [subjectPerformanceError, shouldFetchSubjectPerformance, toast]);

  // Get students based on current view
  const getDisplayStudents = (): Student[] => {
    if (!data) return [];

    let students: Student[] = [];

    if (data.view === "class-teacher") {
      students = data.students || [];
    } else if (data.view === "subject-teacher") {
      if (selectedClassId) {
        const selectedClass = data.classes.find(
          (c) => c.id === selectedClassId
        );
        students = selectedClass?.students || [];
      } else {
        // Show all students from all classes
        students = data.classes.flatMap((c) => c.students || []);
      }
    }

    return students;
  };

  const displayStudents = getDisplayStudents();

  // Auto-select first student when view is class-teacher
  useEffect(() => {
    if (
      view === "class-teacher" &&
      displayStudents.length > 0 &&
      !selectedStudentForDetail
    ) {
      setSelectedStudentForDetail(displayStudents[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, data]);

  // Note: No auto-select for subjects in subject-teacher view
  // User must explicitly choose which subject to view to avoid permission errors

  // Reset pagination when search query or subject changes
  useEffect(() => {
    setSubjectTeacherPage(1);
  }, [searchQuery, selectedSubjectId, selectedClassId]);

  // Reset filter collapse when switching views
  useEffect(() => {
    setFilterCollapsed(false);
  }, [view]);

  return (
    <div className="space-y-4 px-4 lg:px-0 lg:space-y-6">
      {/* Page Header — desktop only (mobile top bar handles title) */}
      <div className="hidden lg:flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">Student Performance</h1>
          <p className="text-muted-foreground text-sm">
            Track and analyze student academic performance
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* View Tabs - Moved to Top */}
      <Tabs
        value={view}
        onValueChange={(v) => {
          setView(v as "class-teacher" | "subject-teacher");
          setSelectedClassId(null);
          setSelectedStudentForDetail(null);
          setSelectedSubjectId(null);
        }}
        className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger
            value="class-teacher"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <GraduationCap className="h-4 w-4 mr-2" />
            As Class Teacher
          </TabsTrigger>
          <TabsTrigger
            value="subject-teacher"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <BookOpen className="h-4 w-4 mr-2" />
            As Subject Teacher
          </TabsTrigger>
        </TabsList>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 gap-6 mt-4 min-h-[600px]">
          {/* Performance Cards Row - Only for Class Teacher */}
          {view === "class-teacher" && (
            <div className="space-y-4">
              {/* Class Info, Student and Assessment Filter */}
              <Card className="p-4">
                {/* ── Mobile filter ── */}
                <div className="lg:hidden space-y-3">
                  {/* Class info chip */}
                  {data?.view === "class-teacher" && data.class && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-semibold text-foreground">{data.class.name}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{data.class.enrolled}/{data.class.capacity} students</span>
                    </div>
                  )}
                  {/* Student selector — full width */}
                  <Select
                    value={selectedStudentForDetail || "none"}
                    onValueChange={(value) =>
                      setSelectedStudentForDetail(value === "none" ? null : value)
                    }>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a student</SelectItem>
                      {displayStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Assessment period — 3 equal buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant={assessmentFilter === "CAT1" ? "default" : "outline"} onClick={() => setAssessmentFilter("CAT1")}>
                      CAT 1
                    </Button>
                    <Button size="sm" variant={assessmentFilter === "MID" ? "default" : "outline"} onClick={() => setAssessmentFilter("MID")}>
                      Mid-Term
                    </Button>
                    <Button size="sm" variant={assessmentFilter === "EOT" ? "default" : "outline"} onClick={() => setAssessmentFilter("EOT")}>
                      End of Term
                    </Button>
                  </div>
                </div>

                {/* ── Desktop filter (original) ── */}
                <div className="hidden lg:flex items-center justify-between gap-4 flex-wrap">
                  {/* Class Info */}
                  {data?.view === "class-teacher" && data.class && (
                    <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-md">
                      <div>
                        <h3 className="text-sm font-semibold">
                          {data.class.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                           {data.class.enrolled}/
                          {data.class.capacity} students
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Student Selector */}
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Student</h3>
                      <p className="text-xs text-muted-foreground">
                        Select student to view
                      </p>
                    </div>
                    <Select
                      value={selectedStudentForDetail || "none"}
                      onValueChange={(value) =>
                        setSelectedStudentForDetail(
                          value === "none" ? null : value
                        )
                      }>
                      <SelectTrigger className="min-w-50">
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a student</SelectItem>
                        {displayStudents.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Assessment Filter */}
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Assessment Period
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Select period to view
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={assessmentFilter === "CAT1" ? "default" : "outline"}
                        onClick={() => setAssessmentFilter("CAT1")}
                        className="min-w-20">
                        CAT 1
                      </Button>
                      <Button
                        size="sm"
                        variant={assessmentFilter === "MID" ? "default" : "outline"}
                        onClick={() => setAssessmentFilter("MID")}
                        className="min-w-20">
                        Mid-Term
                      </Button>
                      <Button
                        size="sm"
                        variant={assessmentFilter === "EOT" ? "default" : "outline"}
                        onClick={() => setAssessmentFilter("EOT")}
                        className="min-w-20">
                        End of Term
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Two Cards in a Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Performance Radar Chart */}
                {selectedStudentForDetail ? (
                  performanceLoading ? (
                    <Card className="h-[450px] flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Performance Radar
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Loading performance data...
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-3 pt-4 px-6">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}
                      </CardContent>
                    </Card>
                  ) : performanceError ? (
                    <Card className="h-[450px] flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Performance Radar
                        </CardTitle>
                        <CardDescription className="text-xs text-destructive">
                          Error loading data
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            {performanceError}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : !performanceData ? (
                    <Card className="h-[450px] flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Performance Radar
                        </CardTitle>
                        <CardDescription className="text-xs">
                          No active term
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <h3 className="font-semibold mb-2">No Active Term</h3>
                          <p className="text-sm text-muted-foreground">
                            Performance data will be available once an academic
                            term is activated and assessments are created.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <StudentPerformanceRadar
                      studentId={selectedStudentForDetail}
                      assessmentType={assessmentFilter}
                      data={performanceData?.radarChartData}
                      classPosition={performanceData?.classPosition}
                      classTotal={performanceData?.classTotal}
                      bestSix={performanceData?.bestSix}
                      bestSixCount={performanceData?.bestSixCount}
                      bestSixType={performanceData?.bestSixType}
                      trend={performanceData?.trend}
                      trendIsAbsolute={performanceData?.trendIsAbsolute}
                      loading={performanceLoading}
                    />
                  )
                ) : (
                  <Card className="h-[450px] flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Performance Radar
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Select a student to view performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                      <div className="text-center text-muted-foreground text-sm">
                        No student selected
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Class Rankings */}
                {selectedStudentForDetail ? (
                  performanceLoading ? (
                    <Card className="h-[450px] flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Class Rankings
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Loading rankings data...
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-3 pt-4 px-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-4 w-6 shrink-0" />
                            <Skeleton className={`h-4 ${["w-32","w-28","w-36","w-24","w-32","w-28","w-36","w-24"][i]}`} />
                            <Skeleton className="h-4 w-12 ml-auto" />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : performanceError ? (
                    <Card className="h-[450px] flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Class Rankings
                        </CardTitle>
                        <CardDescription className="text-xs text-destructive">
                          Error loading data
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            {performanceError}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : !performanceData ? (
                    <Card className="h-[450px] flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-base">
                          Class Rankings
                        </CardTitle>
                        <CardDescription className="text-xs">
                          No active term
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <h3 className="font-semibold mb-2">No Active Term</h3>
                          <p className="text-sm text-muted-foreground">
                            Rankings will be available once an academic term is
                            activated and assessments are created.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <StudentClassRankings
                      studentId={selectedStudentForDetail}
                      assessmentType={assessmentFilter}
                      teacherSubjects={[]}
                      data={performanceData?.classRankings}
                    />
                  )
                ) : (
                  <Card className="h-[450px] flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Class Rankings
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Select a student to view rankings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                      <div className="text-center text-muted-foreground text-sm">
                        No student selected
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Subject Teacher Performance View */}
          {view === "subject-teacher" && (
            <div className="flex flex-col space-y-4 lg:min-h-[600px]">
              {/* Subject and Class Filter — sticky on mobile */}
              <div className="sticky top-0 z-20 -mx-4 px-4 bg-background/95 backdrop-blur-sm pb-2 lg:static lg:mx-0 lg:px-0 lg:bg-transparent lg:backdrop-blur-none lg:pb-0">
              <Card className="p-4">
                {/* ── Mobile filter: collapsible ── */}
                <div className="lg:hidden">
                  {/* Collapse toggle row */}
                  <button
                    onClick={() => setFilterCollapsed((v) => !v)}
                    className="w-full flex items-center justify-between py-0.5"
                  >
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filters</span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", filterCollapsed && "-rotate-90")} />
                  </button>

                  {!filterCollapsed && (
                    <div className="mt-3 space-y-2.5">
                      {/* Row 1: Subject + Class side by side */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Subject selector */}
                        {data?.view === "subject-teacher" ? (
                          <Select
                            value={selectedSubjectId || "none"}
                            onValueChange={(value) => {
                              setSelectedSubjectId(value === "none" ? null : value);
                              setSelectedClassId(null);
                            }}>
                            <SelectTrigger className="w-full h-9 text-xs">
                              <SelectValue placeholder="Subject" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Select subject</SelectItem>
                              {Array.from(
                                new Map(
                                  data.classes.map((cls: any) => {
                                    const subjectId = cls.subjectId ?? cls.subject?.id;
                                    const subjectName = typeof cls.subject === "string" ? cls.subject : cls.subject?.name || "Unknown";
                                    return [subjectId, { id: subjectId, name: subjectName, code: cls.subjectCode || "" }];
                                  })
                                ).values()
                              ).map((subject) => (
                                <SelectItem key={subject.id} value={subject.id || ""}>{subject.name} ({subject.code})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="h-9 rounded-md border border-dashed flex items-center px-3">
                            <span className="text-xs text-muted-foreground">Loading…</span>
                          </div>
                        )}
                        {/* Class filter */}
                        <Select
                          value={selectedClassId || "all"}
                          onValueChange={(value) => setSelectedClassId(value === "all" ? null : value)}
                          disabled={!selectedSubjectId}
                        >
                          <SelectTrigger className="w-full h-9 text-xs">
                            <SelectValue placeholder="Class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All classes</SelectItem>
                            {data?.view === "subject-teacher" && selectedSubjectId && Array.from(
                              new Map(
                                data.classes
                                  .filter((cls: any) => (cls.subjectId ?? cls.subject?.id) === selectedSubjectId)
                                  .map((cls) => [cls.id, { id: cls.id, name: cls.name, grade: cls.grade }])
                              ).values()
                            ).map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>{cls.name} ({cls.grade})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Row 2: Full-width search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="text"
                          placeholder="Search students…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 w-full h-9 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Desktop filter (original) ── */}
                <div className="hidden lg:flex items-center justify-between gap-4 flex-wrap">
                  {/* Subject Selector */}
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Subject</h3>
                      <p className="text-xs text-muted-foreground">
                        Select subject to view
                      </p>
                    </div>
                    {data?.view === "subject-teacher" && (
                      <Select
                        value={selectedSubjectId || "none"}
                        onValueChange={(value) => {
                          setSelectedSubjectId(value === "none" ? null : value);
                          setSelectedClassId(null);
                        }}>
                        <SelectTrigger className="min-w-50">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select a subject</SelectItem>
                          {Array.from(
                            new Map(
                              data.classes.map((cls: any) => {
                                const subjectId = cls.subjectId ?? cls.subject?.id;
                                const subjectName = typeof cls.subject === "string" ? cls.subject : cls.subject?.name || "Unknown";
                                return [subjectId, { id: subjectId, name: subjectName, code: cls.subjectCode || "" }];
                              })
                            ).values()
                          ).map((subject) => (
                            <SelectItem key={subject.id} value={subject.id || ""}>
                              {subject.name} ({subject.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Class Filter */}
                  {data?.view === "subject-teacher" && selectedSubjectId && (
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">Class Filter</h3>
                        <p className="text-xs text-muted-foreground">
                          Filter by specific class
                        </p>
                      </div>
                      <Select
                        value={selectedClassId || "all"}
                        onValueChange={(value) =>
                          setSelectedClassId(value === "all" ? null : value)
                        }>
                        <SelectTrigger className="min-w-50">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Select a Class</SelectItem>
                          {Array.from(
                            new Map(
                              data.classes
                                .filter((cls: any) => (cls.subjectId ?? cls.subject?.id) === selectedSubjectId)
                                .map((cls) => [cls.id, { id: cls.id, name: cls.name, grade: cls.grade }])
                            ).values()
                          ).map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name} ({cls.grade})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Search Field */}
                  {data?.view === "subject-teacher" && selectedSubjectId && (
                    <div className="flex items-center gap-3 flex-1 min-w-[250px]">
                      <div>
                        <h3 className="text-sm font-semibold">Search</h3>
                        <p className="text-xs text-muted-foreground">
                          Filter by student name
                        </p>
                      </div>
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search students..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
              </div>{/* end sticky wrapper */}

              {/* Performance Cards Grid */}
              {selectedSubjectId ? (
                !selectedClassId || selectedClassId === "all" ? (
                  <Card className="p-12 min-h-[400px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold">Select a Class</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Choose a specific class you teach this subject in
                        </p>
                      </div>
                    </div>
                  </Card>
                ) : subjectPerformanceLoading ? (
                  <Card className="p-6 min-h-[400px]">
                    <div className="space-y-3">
                      {Array.from({ length: 8 }).map((_, i) => {
                        const ws = ["w-32","w-28","w-40","w-24","w-36","w-28","w-32","w-24"];
                        return (
                          <div key={i} className="flex items-center gap-4">
                            <Skeleton className={`h-4 ${ws[i]}`} />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-16 ml-auto" />
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ) : subjectPerformanceError ? (
                  <Card className="p-8">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <AlertCircle className="h-12 w-12 text-destructive" />
                      <div>
                        <h3 className="font-semibold">Error Loading Data</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {subjectPerformanceError}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchSubjectPerformance()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  </Card>
                ) : (
                  (() => {
                    // Filter students based on search query
                    const filteredStudents =
                      subjectPerformanceData?.students.filter((student) => {
                        if (!searchQuery.trim()) return true;
                        const query = searchQuery.toLowerCase();
                        return student.studentName
                          .toLowerCase()
                          .includes(query);
                      }) || [];

                    // Calculate pagination
                    const totalStudents = filteredStudents.length;
                    const totalPages = Math.ceil(
                      totalStudents / subjectTeacherPageSize
                    );
                    const startIndex =
                      (subjectTeacherPage - 1) * subjectTeacherPageSize;
                    const endIndex = startIndex + subjectTeacherPageSize;
                    const paginatedStudents = filteredStudents.slice(
                      startIndex,
                      endIndex
                    );

                    if (filteredStudents.length === 0) {
                      return (
                        <Card className="p-12">
                          <div className="flex flex-col items-center gap-3 text-center">
                            <BookOpen className="h-12 w-12 text-muted-foreground" />
                            <div>
                              <h3 className="font-semibold">
                                {searchQuery
                                  ? "No Students Found"
                                  : "No Performance Data"}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {searchQuery
                                  ? `No students match "${searchQuery}"`
                                  : "No assessment results found for this subject"}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    }

                    return (
                      <div className="flex flex-col lg:min-h-[500px]">
                        {/* Cards grid */}
                        <div className="flex-grow">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                            {paginatedStudents.map((student) => {
                              const subjectInfo =
                                data?.view === "subject-teacher"
                                  ? data.classes.find(
                                      (c) =>
                                        "subjectId" in c &&
                                        c.subjectId === selectedSubjectId
                                    )
                                  : null;
                              return (
                                <StudentSubjectPerformance
                                  key={student.studentId}
                                  studentName={student.studentName}
                                  subjectName={subjectInfo?.subject || "Subject"}
                                  assessments={student.assessments}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Mobile compact pagination */}
                        {totalPages > 1 && (
                          <div className="lg:hidden flex items-center justify-between mt-3 pt-3 border-t">
                            <span className="text-xs text-muted-foreground">
                              {(subjectTeacherPage - 1) * subjectTeacherPageSize + 1}–{Math.min(subjectTeacherPage * subjectTeacherPageSize, totalStudents)} of {totalStudents}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline" size="sm"
                                className="h-7 w-7 p-0"
                                disabled={subjectTeacherPage === 1}
                                onClick={() => setSubjectTeacherPage((p) => Math.max(1, p - 1))}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </Button>
                              <span className="text-xs px-1 tabular-nums">{subjectTeacherPage} / {totalPages}</span>
                              <Button
                                variant="outline" size="sm"
                                className="h-7 w-7 p-0"
                                disabled={subjectTeacherPage === totalPages}
                                onClick={() => setSubjectTeacherPage((p) => Math.min(totalPages, p + 1))}>
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Desktop full pagination */}
                        {totalPages > 1 && (
                          <div className="hidden lg:flex items-center justify-center mt-6 pt-4 border-t">
                            <Pagination>
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious
                                    onClick={() => setSubjectTeacherPage(Math.max(1, subjectTeacherPage - 1))}
                                    className={subjectTeacherPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                  />
                                </PaginationItem>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                                  const showPage = pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - subjectTeacherPage) <= 1;
                                  const showEllipsisBefore = pageNum === subjectTeacherPage - 2 && subjectTeacherPage > 3;
                                  const showEllipsisAfter = pageNum === subjectTeacherPage + 2 && subjectTeacherPage < totalPages - 2;
                                  if (showEllipsisBefore || showEllipsisAfter) return <PaginationItem key={pageNum}><PaginationEllipsis /></PaginationItem>;
                                  if (!showPage) return null;
                                  return (
                                    <PaginationItem key={pageNum}>
                                      <PaginationLink onClick={() => setSubjectTeacherPage(pageNum)} isActive={pageNum === subjectTeacherPage} className="cursor-pointer">
                                        {pageNum}
                                      </PaginationLink>
                                    </PaginationItem>
                                  );
                                })}
                                <PaginationItem>
                                  <PaginationNext
                                    onClick={() => setSubjectTeacherPage(Math.min(totalPages, subjectTeacherPage + 1))}
                                    className={subjectTeacherPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )
              ) : (
                <Card className="p-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">Select a Subject</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Choose a subject from the dropdown above to view student
                        performance
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </Tabs>

      {/* Student Details Sheet */}
      <StudentSheet
        studentId={sheetStudentId}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setSheetStudentId(null);
          }
        }}
      />
    </div>
  );
}
