"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Bell,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  StatsCard,
  FilterBar,
  AssessmentTable,
  DetailDrawer,
  ReminderModal,
  ExtendDeadlineModal,
} from "@/components/hod/assessments";
import {
  TeacherAssessmentEntry,
  AssessmentFilterOptions,
  AssessmentDashboardStats,
  StudentEntryDetail,
} from "@/types/hod-assessment";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function HodAssessmentsPage() {
  const { toast } = useToast();

  // Data state
  const [assessments, setAssessments] = useState<TeacherAssessmentEntry[]>([]);
  const [stats, setStats] = useState<AssessmentDashboardStats>({
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    overdue: 0,
    totalAssessments: 0,
  });
  const [filterOptions, setFilterOptions] = useState<{
    terms: { id: string; name: string }[];
    assessmentTypes: string[];
    classes: { id: string; name: string }[];
    teachers: { id: string; name: string }[];
  }>({
    terms: [],
    assessmentTypes: [],
    classes: [],
    teachers: [],
  });

  // UI state
  const [loading, setLoading] = useState(true);   // skeleton — first load only
  const [fetching, setFetching] = useState(false); // inline spinner — filter changes
  const isFirstFetch = useRef(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<AssessmentFilterOptions>({
    term: "",
    assessmentType: "",
    class: "",
    teacher: "",
    status: "All",
  });

  // Modal/Drawer state
  const [selectedAssessment, setSelectedAssessment] =
    useState<TeacherAssessmentEntry | null>(null);
  const [studentEntries, setStudentEntries] = useState<StudentEntryDetail[]>(
    []
  );
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isExtendDeadlineModalOpen, setIsExtendDeadlineModalOpen] =
    useState(false);
  const [isBulkReminder, setIsBulkReminder] = useState(false);

  // Fetch assessment data
  const fetchAssessments = useCallback(async () => {
    try {
      if (isFirstFetch.current) {
        setLoading(true);
      } else {
        setFetching(true);
      }
      const token = localStorage.getItem("auth_token");

      if (!token) {
        toast({
          title: "Error",
          description: "Authentication required",
          variant: "destructive",
        });
        return;
      }

      // Build query params
      const params = new URLSearchParams();
      if (filters.term && filters.term !== "all")
        params.append("termId", filters.term);
      if (filters.assessmentType && filters.assessmentType !== "all")
        params.append("assessmentType", filters.assessmentType);
      if (filters.class && filters.class !== "all")
        params.append("classId", filters.class);
      if (filters.teacher && filters.teacher !== "all")
        params.append("teacherId", filters.teacher);
      if (filters.status && filters.status !== "All")
        params.append("status", filters.status.toLowerCase().replace(" ", "-"));

      const response = await fetch(
        `/api/hod/assessment-entries?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch assessment data");
      }

      const result = await response.json();
      if (result.success) {
        setAssessments(result.data.assessments);
        setStats(result.data.stats);
        setFilterOptions(result.data.filters);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
      toast({
        title: "Error",
        description: "Failed to load assessment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setFetching(false);
      isFirstFetch.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Filter assessments by search query
  const filteredAssessments = useMemo(() => {
    if (!searchQuery) return assessments;

    const query = searchQuery.toLowerCase();
    return assessments.filter(
      (a) =>
        a.teacherName.toLowerCase().includes(query) ||
        a.subject.toLowerCase().includes(query) ||
        a.className.toLowerCase().includes(query)
    );
  }, [assessments, searchQuery]);

  // Handlers
  const handleFilterChange = (
    key: keyof AssessmentFilterOptions,
    value: string
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      term: "",
      assessmentType: "",
      class: "",
      teacher: "",
      status: "All",
    });
    setSearchQuery("");
  };

  const handleViewDetails = async (assessment: TeacherAssessmentEntry) => {
    setSelectedAssessment(assessment);
    // TODO: Fetch actual student entries from API
    // For now, generate mock data based on assessment
    const mockStudents: StudentEntryDetail[] = [];
    for (let i = 0; i < assessment.totalStudents; i++) {
      const scoreEntered = i < assessment.scoresEntered;
      mockStudents.push({
        id: `student-${i}`,
        studentName: `Student ${i + 1}`,
        studentId: `STU${String(i + 1).padStart(4, "0")}`,
        admissionNumber: `ADM${String(i + 1).padStart(4, "0")}`,
        scoreEntered,
        score: scoreEntered ? Math.floor(Math.random() * 40) + 60 : undefined,
        maxScore: 100,
        enteredAt: scoreEntered
          ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          : undefined,
      });
    }
    setStudentEntries(mockStudents);
    setIsDetailDrawerOpen(true);
  };

  const handleSendReminder = (assessment: TeacherAssessmentEntry) => {
    setSelectedAssessment(assessment);
    setIsBulkReminder(false);
    setIsReminderModalOpen(true);
  };

  const handleExtendDeadline = (assessment: TeacherAssessmentEntry) => {
    setSelectedAssessment(assessment);
    setIsExtendDeadlineModalOpen(true);
  };

  const handleBulkReminder = () => {
    setIsBulkReminder(true);
    setIsReminderModalOpen(true);
  };

  const handleExport = (format: "pdf" | "excel") => {
    toast({
      title: "Export Started",
      description: `Generating ${format.toUpperCase()} report...`,
    });
    // Simulate export
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `Your ${format.toUpperCase()} report is ready for download.`,
      });
    }, 1500);
  };

  const pendingCount = filteredAssessments.filter(
    (a) => a.status !== "completed"
  ).length;

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>

        {/* Filter Skeleton */}
        <Skeleton className="h-32 rounded-xl" />

        {/* Table Skeleton */}
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Assessment Entry Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Track teacher score submissions for your department
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAssessments}
            className="hidden sm:flex"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={handleBulkReminder}
            disabled={pendingCount === 0}
          >
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Bulk Reminder</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Completed"
          value={stats.completed}
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="In Progress"
          value={stats.inProgress}
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="Not Started"
          value={stats.notStarted}
          icon={XCircle}
          variant="info"
        />
        <StatsCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertCircle}
          variant="danger"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        searchQuery={searchQuery}
        onFilterChange={handleFilterChange}
        onSearchChange={setSearchQuery}
        onClearFilters={handleClearFilters}
        filterOptions={filterOptions}
      />

      {/* Inline loading indicator for filter changes */}
      {fetching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating results…
        </div>
      )}

      {/* Assessment Table */}
      <AssessmentTable
        assessments={filteredAssessments}
        onViewDetails={handleViewDetails}
        onSendReminder={handleSendReminder}
        onExtendDeadline={handleExtendDeadline}
      />

      {/* Detail Drawer */}
      <DetailDrawer
        assessment={selectedAssessment}
        studentEntries={studentEntries}
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        onSendReminder={handleSendReminder}
        onLockAssessment={(assessment) => {
          toast({
            title: "Assessment Locked",
            description: `Assessment for ${assessment.subject} has been locked.`,
          });
          setIsDetailDrawerOpen(false);
        }}
        onContactTeacher={(assessment) => {
          window.open(`mailto:${assessment.teacherEmail}`, "_blank");
        }}
      />

      {/* Reminder Modal */}
      <ReminderModal
        assessment={selectedAssessment}
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        isBulk={isBulkReminder}
        selectedCount={pendingCount}
        bulkRecipientUserIds={filteredAssessments
          .filter((a) => a.status !== "completed")
          .map((a) => a.teacherUserId)
          .filter((id, i, arr) => arr.indexOf(id) === i)}
      />

      {/* Extend Deadline Modal */}
      <ExtendDeadlineModal
        assessment={selectedAssessment}
        isOpen={isExtendDeadlineModalOpen}
        onClose={() => setIsExtendDeadlineModalOpen(false)}
        onSuccess={fetchAssessments}
      />
    </div>
  );
}
