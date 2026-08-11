"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  Plus,
  FileText,
  Trash2,
  Eye,
  ClipboardEdit,
  CalendarDays,
  BookOpen,
  GraduationCap,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { cn, formatClassLabel } from "@/lib/utils";

/**
 * Teacher Assessments Page
 * Desktop: Two-card layout (detail left, list right)
 * Mobile:  List card full-width; tapping an item opens a bottom sheet with details + actions
 */

interface Assessment {
  id: string;
  title: string;
  examType: string;
  totalMarks: number;
  passMark: number;
  weight: number;
  assessmentDate: string | null;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED";
  subject: {
    id: string;
    name: string;
    code: string;
  };
  class: {
    id: string;
    name: string;
    grade: {
      name: string;
    };
  };
  term: {
    id: string;
    termType: string;
    academicYear: {
      year: number;
    };
  };
  _count: {
    results: number;
  };
  createdBy?: {
    id: string;
    user: {
      email: string;
    };
  };
}

interface Term {
  id: string;
  termType: string;
  isActive: boolean;
  academicYear: {
    year: number;
  };
}

interface ClassData {
  id: string;
  name: string;
  grade: string;
  teachingSubjectId?: string;
}

interface SubjectTeacherAssignment {
  classId: string;
  subjectId: string;
}

const TERM_LABELS: Record<string, string> = {
  TERM_1: "Term 1",
  TERM_2: "Term 2",
  TERM_3: "Term 3",
};

export default function TeacherAssessmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  // Mobile bottom sheet
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingPublishId, setPendingPublishId] = useState<string | null>(null);
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [classTeacherClassIds, setClassTeacherClassIds] = useState<string[]>([]);
  const [classTeacherAssignments, setClassTeacherAssignments] = useState<SubjectTeacherAssignment[]>([]);
  const [subjectTeacherAssignments, setSubjectTeacherAssignments] = useState<SubjectTeacherAssignment[]>([]);

  // All selections derived from URL - URL is the single source of truth
  const selectedAssessmentId = searchParams.get("assessmentId");
  const selectedTermId = searchParams.get("termId") || "";
  const selectedClassId = searchParams.get("classId") || "all";
  const selectedExamType = searchParams.get("examType") || "all";
  const activeTab = (searchParams.get("tab") || "class-teacher") as "class-teacher" | "subject-teacher";

  const updateURLParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const termsData = await api.get("/terms");
        const terms = termsData.data || [];
        setTerms(terms);

        if (!selectedTermId) {
          const activeTerm = terms.find((t: Term) => t.isActive);
          if (activeTerm) {
            updateURLParam("termId", activeTerm.id);
          }
        }

        const classesResponse = await api.get("/teacher/classes");
        const classesData = classesResponse.data || {};
        const allTeacherClasses: ClassData[] = [];
        const ctClassIds: string[] = [];

        const ctAssignments: SubjectTeacherAssignment[] = [];
        if (classesData.classTeacherClasses) {
          classesData.classTeacherClasses.forEach((c: any) => {
            allTeacherClasses.push({
              id: c.id,
              name: c.name,
              grade: c.gradeLevel,
              teachingSubjectId: c.teachingSubjectId,
            });
            ctClassIds.push(c.id);
            // A class teacher can personally teach more than one subject in
            // their own class (secondary grades) — register all of them, not
            // just the first, so assessments for any of those subjects match.
            if (c.teachingSubjects && c.teachingSubjects.length > 0) {
              c.teachingSubjects.forEach((s: { id: string; name: string }) => {
                ctAssignments.push({ classId: c.id, subjectId: s.id });
              });
            } else if (c.teachingSubjectId) {
              ctAssignments.push({ classId: c.id, subjectId: c.teachingSubjectId });
            }
          });
        }

        const stAssignments: SubjectTeacherAssignment[] = [];
        if (classesData.subjectTeacherClasses) {
          classesData.subjectTeacherClasses.forEach((c: any) => {
            if (!allTeacherClasses.find((cls) => cls.id === c.id)) {
              allTeacherClasses.push({
                id: c.id,
                name: c.name,
                grade: c.gradeLevel,
                teachingSubjectId: c.teachingSubjectId,
              });
            }
            if (c.teachingSubjectId) {
              stAssignments.push({ classId: c.id, subjectId: c.teachingSubjectId });
            }
          });
        }

        setClasses(allTeacherClasses);
        setClassTeacherClassIds(ctClassIds);
        setClassTeacherAssignments(ctAssignments);
        setSubjectTeacherAssignments(stAssignments);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      }
    };
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTermId) {
      fetchAssessments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTermId, selectedClassId, selectedExamType]);

  const updateURL = (assessmentId: string | null) => {
    updateURLParam("assessmentId", assessmentId);
  };

  const setSelectedTermId = (termId: string) => updateURLParam("termId", termId);
  const setSelectedClassId = (classId: string) => updateURLParam("classId", classId);
  const setSelectedExamType = (examType: string) => updateURLParam("examType", examType);
  const setActiveTab = (tab: "class-teacher" | "subject-teacher") => updateURLParam("tab", tab);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ termId: selectedTermId });
      if (selectedClassId !== "all") params.append("classId", selectedClassId);
      if (selectedExamType !== "all") params.append("examType", selectedExamType);
      const result = await api.get(`/assessments?${params.toString()}`);
      setAssessments(result.data || []);
    } catch (error: any) {
      console.error("Error fetching assessments:", error);
      toast({
        title: "Failed to Load Assessments",
        description: error.message || "Could not fetch assessments. Please try again.",
        variant: "destructive",
      });
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => { setPendingDeleteId(id); setDeleteDialogOpen(true); };
  const handlePublishClick = (id: string) => { setPendingPublishId(id); setPublishDialogOpen(true); };
  const handleCompleteClick = (id: string) => { setPendingCompleteId(id); setCompleteDialogOpen(true); };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await api.delete(`/assessments/${pendingDeleteId}`);
      toast({ title: "Assessment Deleted", description: "The assessment has been successfully removed." });
      if (selectedAssessmentId === pendingDeleteId) updateURL(null);
      fetchAssessments();
    } catch (error: any) {
      toast({ title: "Failed to Delete", description: error.message || "Could not delete assessment.", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setPendingDeleteId(null);
    }
  };

  const confirmPublish = async () => {
    if (!pendingPublishId) return;
    try {
      await api.post(`/assessments/${pendingPublishId}/publish`, {});
      toast({ title: "Assessment Published", description: "The assessment is now live and ready for result entry." });
      fetchAssessments();
    } catch (error: any) {
      toast({ title: "Failed to Publish", description: error.message || "Could not publish assessment.", variant: "destructive" });
    } finally {
      setPublishDialogOpen(false);
      setPendingPublishId(null);
    }
  };

  const confirmComplete = async () => {
    if (!pendingCompleteId) return;
    try {
      await api.post(`/assessments/${pendingCompleteId}/complete`, {});
      toast({ title: "Assessment Completed", description: "The assessment has been marked as completed and can now be used for report card generation." });
      fetchAssessments();
    } catch (error: any) {
      toast({ title: "Failed to Complete", description: error.message || "Could not complete assessment.", variant: "destructive" });
    } finally {
      setCompleteDialogOpen(false);
      setPendingCompleteId(null);
    }
  };

  const handleBulkDeleteClick = () => {
    const draftAssessments = displayedAssessments.filter((a) => a.status === "DRAFT");
    if (draftAssessments.length === 0) {
      toast({ title: "No Drafts", description: "There are no draft assessments to delete." });
      return;
    }
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    const draftAssessments = displayedAssessments.filter((a) => a.status === "DRAFT");
    try {
      let successCount = 0;
      let failCount = 0;
      for (const assessment of draftAssessments) {
        try {
          await api.delete(`/assessments/${assessment.id}`);
          successCount++;
        } catch {
          failCount++;
        }
      }
      toast({
        title: successCount > 0 ? "Drafts Deleted" : "Delete Failed",
        description: `Successfully deleted ${successCount} draft(s).${failCount > 0 ? ` ${failCount} failed.` : ""}`,
        variant: successCount > 0 ? "default" : "destructive",
      });
      updateURL(null);
      fetchAssessments();
    } catch (error: any) {
      toast({ title: "Failed to Delete Drafts", description: error.message || "Could not delete draft assessments.", variant: "destructive" });
    } finally {
      setBulkDeleteDialogOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":    return <Badge variant="outline" className="border-muted-foreground/50">Draft</Badge>;
      case "PUBLISHED": return <Badge variant="default">Published</Badge>;
      case "COMPLETED": return <Badge variant="secondary">Completed</Badge>;
      default:         return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExamTypeBadge = (examType: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      CAT: "default", MID: "secondary", EOT: "destructive",
    };
    const labels: Record<string, string> = { CAT: "CAT", MID: "Mid-Term", EOT: "End of Term" };
    return <Badge variant={variants[examType] || "outline"}>{labels[examType] || examType}</Badge>;
  };

  const classTeacherAssessments = assessments.filter((a) => {
    if (!classTeacherClassIds.includes(a.class.id)) return false;
    if (classTeacherAssignments.length > 0) {
      return classTeacherAssignments.some(
        (cta) => cta.classId === a.class.id && cta.subjectId === a.subject.id
      );
    }
    return true;
  });

  const subjectTeacherAssessments = assessments.filter((a) =>
    subjectTeacherAssignments.some(
      (sta) => sta.classId === a.class.id && sta.subjectId === a.subject.id
    )
  );

  const displayedAssessments =
    activeTab === "class-teacher" ? classTeacherAssessments : subjectTeacherAssessments;

  useEffect(() => {
    if (displayedAssessments.length === 0) return;
    const exists = displayedAssessments.some((a) => a.id === selectedAssessmentId);
    if (!exists) {
      updateURL(displayedAssessments[0].id);
    }
  }, [displayedAssessments, selectedAssessmentId]);

  const selectedAssessment = displayedAssessments.find((a) => a.id === selectedAssessmentId);

  // Shared detail + action content — used in both the desktop left card and the mobile sheet
  const DetailContent = ({ assessment }: { assessment: Assessment }) => (
    <>
      <div className="flex-1 overflow-y-auto space-y-6 p-6">
        {/* Assessment Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Subject</span>
            </div>
            <p className="font-medium">
              {assessment.subject.name} ({assessment.subject.code})
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              <span className="text-sm">Class</span>
            </div>
            <p className="font-medium">
              {formatClassLabel(assessment.class.grade.name, assessment.class.name)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Total Marks</span>
            </div>
            <p className="font-medium">{assessment.totalMarks}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Pass Mark</span>
            </div>
            <p className="font-medium">{assessment.passMark}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Weight</span>
            </div>
            <p className="font-medium">{assessment.weight}</p>
          </div>

          {assessment.assessmentDate && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span className="text-sm">Assessment Date</span>
              </div>
              <p className="font-medium">
                {new Date(assessment.assessmentDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Results Summary */}
        <div>
          <h3 className="font-semibold mb-2">Results Summary</h3>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Results Entered</span>
              <span className="font-semibold">{assessment._count.results}</span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="p-6 space-y-2">
        {assessment.status === "DRAFT" ? (
          <>
            <Button className="w-full" onClick={() => handlePublishClick(assessment.id)}>
              <Send className="h-4 w-4 mr-2" />
              Publish Assessment
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => handleDeleteClick(assessment.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Draft
            </Button>
          </>
        ) : assessment.status === "PUBLISHED" ? (
          <>
            <Button
              className="w-full"
              onClick={() => router.push(`/teacher/assessments/${assessment.id}/enter-results`)}>
              <ClipboardEdit className="h-4 w-4 mr-2" />
              Enter Marks
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => handleCompleteClick(assessment.id)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Completed
            </Button>
          </>
        ) : (
          <Button
            className="w-full"
            onClick={() => router.push(`/teacher/assessments/${assessment.id}/enter-results`)}>
            <ClipboardEdit className="h-4 w-4 mr-2" />
            View Results
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/teacher/assessments/${assessment.id}`)}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </div>
    </>
  );

  // Shared assessment list rows — used in both tabs
  const AssessmentList = ({ items }: { items: Assessment[] }) => (
    <div className="space-y-1.5">
      {items.map((assessment) => (
        <div
          key={assessment.id}
          onClick={() => {
            updateURL(assessment.id);
            // Open sheet only on mobile (< lg = 1024px)
            if (window.innerWidth < 1024) {
              setMobileSheetOpen(true);
            }
          }}
          className={cn(
            "p-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
            selectedAssessmentId === assessment.id && "bg-muted border-primary"
          )}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{assessment.subject.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatClassLabel(assessment.class.grade.name, assessment.class.name)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {getExamTypeBadge(assessment.examType)}
                {getStatusBadge(assessment.status)}
              </div>
              <p className="text-xs text-muted-foreground">
                {assessment._count.results} students
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const draftCount = displayedAssessments.filter((a) => a.status === "DRAFT").length;

  return (
    <div className="lg:space-y-6 lg:p-0">
      {/* Page Header — desktop only; mobile top bar handles the title */}
      <div className="hidden lg:flex items-center justify-between mt-2">
        <div>
          <h1 className="text-xl font-bold">Assessments</h1>
          <p className="text-muted-foreground text-sm">
            Manage CAT, Mid-Term, and End of Term assessments
          </p>
        </div>
      </div>

      {/* Two-Card Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 lg:gap-6">

        {/* ── LEFT CARD: Assessment Details — desktop only ── */}
        <Card className="hidden lg:flex lg:col-span-2 flex-col h-[calc(100vh-12rem)]">
          {selectedAssessment ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getExamTypeBadge(selectedAssessment.examType)}
                      {getStatusBadge(selectedAssessment.status)}
                    </div>
                    <CardTitle className="text-xl">
                      {selectedAssessment.subject.name} — {selectedAssessment.examType}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatClassLabel(selectedAssessment.class.grade.name, selectedAssessment.class.name)}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <Separator />

              <DetailContent assessment={selectedAssessment} />
            </>
          ) : (
            <Empty className="h-full">
              <EmptyContent>
                <EmptyMedia><FileText className="h-6 w-6" /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No assessment selected</EmptyTitle>
                  <EmptyDescription>
                    Select an assessment from the list to view details and enter marks
                  </EmptyDescription>
                </EmptyHeader>
              </EmptyContent>
            </Empty>
          )}
        </Card>

        {/* ── RIGHT CARD: Assessment List ── */}
        {/* Mobile: edge-to-edge (no border-radius, no side borders) */}
        {/* Desktop: normal rounded card with fixed height */}
        <Card className="col-span-1 lg:col-span-3 flex flex-col rounded-none border-x-0 lg:rounded-lg lg:border-x lg:h-[calc(100vh-12rem)]">
          <CardHeader className="px-4 py-3 lg:px-6 lg:pb-3">
            {/* Card title + action buttons */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <CardTitle className="text-base">My Assessments</CardTitle>
              <div className="flex items-center gap-2">
                {/* Secondary actions — desktop only */}
                {draftCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="hidden lg:flex"
                    onClick={handleBulkDeleteClick}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Drafts ({draftCount})
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="hidden lg:flex"
                  onClick={() => router.push("/teacher/assessments/markschedule")}>
                  Mark Schedule
                </Button>
                {/* Create button — always visible */}
                <Button size="sm" onClick={() => router.push("/teacher/assessments/new")}>
                  <Plus className="h-4 w-4 mr-1 lg:mr-2" />
                  <span className="hidden lg:inline">Create Assessment</span>
                  <span className="lg:hidden">New</span>
                </Button>
              </div>
            </div>

            {/* Filters — equal-width, full row, compact on mobile */}
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                  <SelectTrigger className="w-full h-8 text-xs lg:h-9 lg:text-sm">
                    <SelectValue placeholder="Term" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {TERM_LABELS[term.termType] ?? term.termType.replace("_", " ")} · {term.academicYear.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-0">
                <Select
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  disabled={activeTab === "class-teacher"}>
                  <SelectTrigger
                    className={cn(
                      "w-full h-8 text-xs lg:h-9 lg:text-sm",
                      activeTab === "class-teacher" && "opacity-50 cursor-not-allowed"
                    )}>
                    <SelectValue placeholder="Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {formatClassLabel(classItem.grade, classItem.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-0">
                <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                  <SelectTrigger className="w-full h-8 text-xs lg:h-9 lg:text-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="CAT">CAT</SelectItem>
                    <SelectItem value="MID">Mid-Term</SelectItem>
                    <SelectItem value="EOT">End of Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mark Schedule — mobile only, sits below filters */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden w-full mt-2"
              onClick={() => router.push("/teacher/assessments/markschedule")}>
              Mark Schedule
            </Button>
          </CardHeader>

          <Separator />

          <CardContent className="flex-1 overflow-hidden p-0">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="h-full flex flex-col">
              <TabsList className="w-full rounded-none border-b">
                <TabsTrigger value="class-teacher" className="flex-1">
                  Class Teacher
                </TabsTrigger>
                <TabsTrigger value="subject-teacher" className="flex-1">
                  Subject Teacher
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                {/* Class Teacher tab */}
                <TabsContent value="class-teacher" className="m-0 p-3 lg:p-4">
                  {loading ? (
                    <div className="space-y-1.5">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-2.5 rounded-lg border">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Skeleton className="h-5 w-20" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : classTeacherAssessments.length === 0 ? (
                    <Empty className="h-64">
                      <EmptyContent>
                        <EmptyMedia><FileText className="h-6 w-6" /></EmptyMedia>
                        <EmptyHeader>
                          <EmptyTitle>No class teacher assessments</EmptyTitle>
                          <EmptyDescription>
                            No assessments found for classes where you teach all subjects
                          </EmptyDescription>
                        </EmptyHeader>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <AssessmentList items={classTeacherAssessments} />
                  )}
                </TabsContent>

                {/* Subject Teacher tab */}
                <TabsContent value="subject-teacher" className="m-0 p-3 lg:p-4">
                  {loading ? (
                    <div className="space-y-1.5">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-2.5 rounded-lg border">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Skeleton className="h-5 w-20" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : subjectTeacherAssessments.length === 0 ? (
                    <Empty className="h-64">
                      <EmptyContent>
                        <EmptyMedia><FileText className="h-6 w-6" /></EmptyMedia>
                        <EmptyHeader>
                          <EmptyTitle>No subject teacher assessments</EmptyTitle>
                          <EmptyDescription>
                            No assessments found for classes where you teach specific subjects
                          </EmptyDescription>
                        </EmptyHeader>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    <AssessmentList items={subjectTeacherAssessments} />
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* ── MOBILE BOTTOM SHEET: Assessment Detail ── */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent
          side="bottom"
          className="lg:hidden rounded-t-2xl p-0 max-h-[88vh] flex flex-col overflow-hidden">
          {selectedAssessment ? (
            <>
              <SheetHeader className="px-5 pt-5 pb-0 shrink-0">
                {/* Drag handle */}
                <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-4" />
                <div className="flex items-center gap-2 mb-2">
                  {getExamTypeBadge(selectedAssessment.examType)}
                  {getStatusBadge(selectedAssessment.status)}
                </div>
                <SheetTitle className="text-xl text-left">
                  {selectedAssessment.subject.name} — {selectedAssessment.examType}
                </SheetTitle>
                <p className="text-sm text-muted-foreground text-left pb-1">
                  {formatClassLabel(selectedAssessment.class.grade.name, selectedAssessment.class.name)}
                </p>
              </SheetHeader>

              <Separator />

              <div className="flex-1 overflow-y-auto flex flex-col">
                <DetailContent assessment={selectedAssessment} />
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No assessment selected
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Confirmation Dialogs ── */}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft assessment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to publish this assessment? Once published, teachers can start
              entering results and the assessment cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPublish}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this assessment as completed? This indicates that all
              results have been entered and the assessment data can be used for report card
              generation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmComplete}>Mark as Completed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Draft Assessments</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {draftCount} draft assessment(s)? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
