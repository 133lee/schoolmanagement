"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn, formatCompactClassLabel, getErrorMessage } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  ArrowLeft,
  Save,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Hash,
  Search,
  UserX,
  Lock,
  Clock,
  CalendarClock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

// ── Types ────────────────────────────────────────────────────────────────────

interface Assessment {
  id: string;
  title: string;
  totalMarks: number;
  passMark: number;
  examType: string;
  status: string;
  subject: { name: string; code: string };
  class: { id: string; name: string; grade: { name: string } };
  term: { id: string; academicYear: { id: string } };
}

interface Student {
  id: string;
  studentNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
}

interface Result {
  id?: string;
  studentId: string;
  marksObtained: number | string;
  isAbsent?: boolean;
  grade?: string | null;
  remarks?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EXAM_LABELS: Record<string, string> = {
  CAT: "CAT",
  MID: "Mid-Term",
  EOT: "End of Term",
};

const EXAM_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  CAT: "default",
  MID: "secondary",
  EOT: "destructive",
};

function pct(marks: number, total: number) {
  return Math.round((marks / total) * 100);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EnterResultsPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;
  const { toast } = useToast();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [showAutoSaveSuccess, setShowAutoSaveSuccess] = useState(false);

  // Entry window state
  const [windowState, setWindowState] = useState<"before_open" | "open" | "closed" | "not_configured" | null>(null);
  const [windowData, setWindowData] = useState<{ opensAt: string; closesAt: string } | null>(null);

  // Blocking dialog — shown when entry is permanently locked (closed / not_configured)
  const [blockingWindowOpen, setBlockingWindowOpen] = useState(false);

  // Remarks: which rows have the textarea open
  const [openRemarks, setOpenRemarks] = useState<Set<string>>(new Set());

  // Fill-zeros confirmation dialog
  const [showFillZeroDialog, setShowFillZeroDialog] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Keyboard navigation — one ref per student input
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Debounce timers per student
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAssessment();
    fetchExistingResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  // Open blocking dialog as soon as we know the window is permanently locked
  useEffect(() => {
    if (windowState === "closed" || windowState === "not_configured") {
      setBlockingWindowOpen(true);
    }
  }, [windowState]);

  const fetchAssessment = async () => {
    try {
      const response = await api.get(`/assessments/${assessmentId}`);
      setAssessment(response.data);
      fetchStudents(response.data.class.id, response.data.term.academicYear.id);
      // Fetch entry window for this term + exam type
      try {
        const wRes = await api.get(`/assessment-windows?termId=${response.data.term.id}&examType=${response.data.examType}`);
        setWindowState(wRes.data.state);
        setWindowData(wRes.data.window);
      } catch {
        setWindowState("not_configured");
      }
    } catch {
      toast({ title: "Error", description: "Failed to load assessment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (classId: string, academicYearId: string) => {
    try {
      const response = await api.get(`/classes/${classId}/students?academicYearId=${academicYearId}`);
      const enrollments = response.data || [];
      setStudents(enrollments.map((e: any) => e.student));
    } catch {
      toast({ title: "Error", description: "Failed to load students", variant: "destructive" });
    }
  };

  const fetchExistingResults = async () => {
    try {
      const response = await api.get(`/assessments/${assessmentId}/results`);
      const data = response.data || [];
      const map: Record<string, Result> = {};
      data.forEach((r: any) => {
        map[r.student.id] = {
          id: r.id,
          studentId: r.student.id,
          marksObtained: r.isAbsent ? "AB" : r.marksObtained,
          isAbsent: r.isAbsent || false,
          grade: r.grade,
          remarks: r.remarks || "",
        };
      });
      setResults(map);
      // Pre-open remarks rows that already have a remark
      const withRemarks = new Set<string>(
        data.filter((r: any) => r.remarks).map((r: any) => r.student.id as string)
      );
      setOpenRemarks(withRemarks);
    } catch {
      // non-fatal — just means no prior results
    }
  };

  // ── Save logic ────────────────────────────────────────────────────────────

  const autoSaveResult = useCallback(
    async (studentId: string, marks: string, isAbsent: boolean, remarks?: string) => {
      if (!assessment) return;
      if (!isAbsent && (marks === "" || marks === undefined)) return;

      if (assessment.status === "DRAFT") {
        toast({
          title: "Cannot Save",
          description: "Publish this assessment before entering results.",
          variant: "destructive",
        });
        return;
      }

      let payload: Record<string, any> = { studentId, ...(remarks !== undefined && { remarks }) };

      if (isAbsent) {
        payload = { ...payload, marksObtained: 0, isAbsent: true };
      } else {
        const marksNum = parseFloat(marks);
        if (isNaN(marksNum) || marksNum < 0 || marksNum > assessment.totalMarks) {
          toast({
            title: "Invalid Marks",
            description: `Must be between 0 and ${assessment.totalMarks}`,
            variant: "destructive",
          });
          return;
        }
        payload = { ...payload, marksObtained: marksNum, isAbsent: false };
      }

      try {
        setSavingStudentId(studentId);
        const saved = await api.post(`/assessments/${assessmentId}/results`, payload);
        setResults(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            id: saved.data.id,
            marksObtained: isAbsent ? "AB" : payload.marksObtained,
            isAbsent,
          },
        }));
        setShowAutoSaveSuccess(true);
        setTimeout(() => setShowAutoSaveSuccess(false), 2000);
      } catch (err) {
        toast({ title: "Auto-save Failed", description: getErrorMessage(err, "Failed to save"), variant: "destructive" });
      } finally {
        setSavingStudentId(null);
      }
    },
    [assessment, assessmentId, toast]
  );

  const scheduleAutoSave = (studentId: string, marks: string, isAbsent: boolean, remarks?: string) => {
    clearTimeout(debounceTimers.current[studentId]);
    debounceTimers.current[studentId] = setTimeout(
      () => autoSaveResult(studentId, marks, isAbsent, remarks),
      500
    );
  };

  // ── Input handlers ────────────────────────────────────────────────────────

  const handleMarksChange = (studentId: string, value: string) => {
    setResults(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], studentId, marksObtained: value, isAbsent: false },
    }));
  };

  const handleMarksBlur = (studentId: string, value: string) => {
    scheduleAutoSave(studentId, value, false, results[studentId]?.remarks);
  };

  const handleToggleAbsent = (studentId: string) => {
    const current = results[studentId];
    const nowAbsent = !current?.isAbsent;
    setResults(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], studentId, marksObtained: nowAbsent ? "AB" : "", isAbsent: nowAbsent },
    }));
    if (nowAbsent) {
      scheduleAutoSave(studentId, "AB", true, current?.remarks);
    }
  };

  // Enter / ArrowDown → next input   ArrowUp → previous input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleRemarksChange = (studentId: string, value: string) => {
    setResults(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], studentId, remarks: value },
    }));
    const r = results[studentId];
    const marks = String(r?.marksObtained ?? "");
    const isAbsent = r?.isAbsent ?? false;
    if (isAbsent || marks !== "") scheduleAutoSave(studentId, marks, isAbsent, value);
  };

  const toggleRemarks = (studentId: string) => {
    setOpenRemarks(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  // ── Fill zeros ────────────────────────────────────────────────────────────

  const fillZeroForUnmarked = () => {
    setResults(prev => {
      const updated = { ...prev };
      students.forEach(s => {
        const existing = updated[s.id];
        // Skip students already marked AB or with a score entered
        if (existing?.isAbsent) return;
        if (!existing || existing.marksObtained === "" || existing.marksObtained === undefined) {
          updated[s.id] = { ...existing, studentId: s.id, marksObtained: 0, isAbsent: false };
        }
      });
      return updated;
    });
    setShowFillZeroDialog(false);
    toast({ title: "Done", description: "Set 0 for all unmarked students. Save when ready." });
  };

  // ── Save all ──────────────────────────────────────────────────────────────

  const handleSaveAll = async () => {
    if (!assessment) return;
    if (assessment.status === "DRAFT") {
      toast({ title: "Cannot Save", description: "Publish this assessment first.", variant: "destructive" });
      return;
    }

    const entries = Object.values(results).filter(r => {
      if (r.isAbsent) return true;
      return r.marksObtained !== "" && r.marksObtained !== undefined;
    });
    if (entries.length === 0) {
      toast({ title: "No Results", description: "Enter at least one mark or mark a student as AB.", variant: "destructive" });
      return;
    }

    const invalid = entries.find(r => {
      if (r.isAbsent) return false;
      const n = typeof r.marksObtained === "string" ? parseFloat(r.marksObtained) : r.marksObtained;
      return isNaN(n) || n < 0 || n > assessment.totalMarks;
    });
    if (invalid) {
      toast({ title: "Invalid Marks", description: `All marks must be between 0 and ${assessment.totalMarks}`, variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const payload = entries.map(r => {
        if (r.isAbsent) {
          return {
            studentId: r.studentId,
            marksObtained: 0,
            isAbsent: true,
            ...(r.remarks !== undefined && { remarks: r.remarks }),
          };
        }
        return {
          studentId: r.studentId,
          marksObtained: typeof r.marksObtained === "string" ? parseFloat(r.marksObtained) : r.marksObtained,
          isAbsent: false,
          ...(r.remarks !== undefined && { remarks: r.remarks }),
        };
      });

      const res = await api.post(`/assessments/${assessmentId}/results`, payload);
      const data = res.data || res;
      toast({
        title: "Saved",
        description: `${data.successful ?? payload.length} result(s) saved${data.failed?.length ? `, ${data.failed.length} failed` : ""}`,
      });
      fetchExistingResults();
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err, "Failed to save"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const enteredCount = students.filter(s => {
    const r = results[s.id];
    if (!r) return false;
    if (r.isAbsent) return true;
    return r.marksObtained !== "" && r.marksObtained !== undefined;
  }).length;

  const unmarkedCount = students.length - enteredCount;

  const classAverage = (() => {
    const entered = students
      .map(s => results[s.id])
      .filter(r => r && !r.isAbsent && r.marksObtained !== "" && r.marksObtained !== undefined)
      .map(r => (typeof r!.marksObtained === "string" ? parseFloat(r!.marksObtained) : r!.marksObtained))
      .filter(n => !isNaN(n));
    if (entered.length === 0) return null;
    return (entered.reduce((a, b) => a + b, 0) / entered.length).toFixed(1);
  })();

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      `${s.firstName}${s.middleName ? ` ${s.middleName}` : ""} ${s.lastName}`
        .toLowerCase()
        .includes(q)
    );
  }, [students, searchQuery]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3 lg:space-y-4">
        <div className="flex items-start justify-between mt-2 px-4 lg:px-0">
          <Skeleton className="h-9 w-20" />
          <div className="text-right space-y-1">
            <Skeleton className="h-7 w-36 ml-auto" />
            <Skeleton className="h-4 w-52 ml-auto" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="border rounded-lg overflow-hidden">
          {/* Column headers — desktop */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2.5 bg-muted/50 border-b">
            <Skeleton className="col-span-1 h-3 w-6" />
            <Skeleton className="col-span-4 h-3 w-16" />
            <Skeleton className="col-span-3 h-3 w-14" />
            <Skeleton className="col-span-2 h-3 w-8" />
            <Skeleton className="col-span-2 h-3 w-16 ml-auto" />
          </div>
          {/* Column headers — mobile */}
          <div className="lg:hidden flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b">
            <Skeleton className="h-3 w-16 flex-1" />
            <Skeleton className="h-3 w-10 shrink-0" />
            <Skeleton className="h-3 w-10 shrink-0" />
          </div>

          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                {/* Mobile row */}
                <div className="lg:hidden flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-9 w-16 rounded-md shrink-0" />
                  <div className="flex items-center gap-1.5 shrink-0 w-[60px] justify-end">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                </div>
                {/* Desktop row */}
                <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 items-center">
                  <Skeleton className="col-span-1 h-4 w-6" />
                  <Skeleton className="col-span-4 h-4 w-36" />
                  <Skeleton className="col-span-3 h-8 w-24" />
                  <Skeleton className="col-span-2 h-4 w-12" />
                  <Skeleton className="col-span-2 h-5 w-12 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push("/teacher/assessments")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assessments
        </Button>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <p className="text-muted-foreground font-medium">
            This assessment could not be loaded.
          </p>
          <p className="text-sm text-muted-foreground">
            It may have been deleted, or you may not have permission to enter results for it.
          </p>
        </div>
      </div>
    );
  }

  const isDraft = assessment.status === "DRAFT";
  const isWindowBlocked = windowState === "before_open" || windowState === "closed" || windowState === "not_configured";
  const isEntryBlocked = isDraft || isWindowBlocked;

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mt-2 px-4 lg:px-0">
        <Button variant="outline" size="sm" onClick={() => router.push("/teacher/assessments")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-right">
          {/* Desktop: full title */}
          <h1 className="hidden lg:block text-xl font-bold">Enter Results</h1>
          <p className="text-sm font-medium text-foreground lg:font-normal lg:text-muted-foreground">
            {assessment.subject.name} &bull;{" "}
            {formatCompactClassLabel(assessment.class.grade.name, assessment.class.name)}
          </p>
        </div>
      </div>

      {/* ── Window / draft warnings ── */}
      {/* "closed" and "not_configured" are handled by the blocking dialog below */}
      {(windowState === "before_open" || (windowState === "open" && isDraft)) && (
        <div className="px-4 lg:px-0 space-y-3">
          {windowState === "before_open" && windowData && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Entry Window Not Yet Open</AlertTitle>
              <AlertDescription>
                You can prepare this assessment, but score entry opens on{" "}
                <strong>{fmtDate(windowData.opensAt)}</strong>.
              </AlertDescription>
            </Alert>
          )}
          {windowState === "open" && isDraft && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Assessment Not Published</AlertTitle>
              <AlertDescription>
                Publish this assessment before entering results.
                {windowData && <> Window closes on <strong>{fmtDate(windowData.closesAt)}</strong>.</>}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* ── Info bar ── */}
      <Card className="py-3 rounded-none border-x-0 lg:rounded-lg lg:border-x">
        <CardContent className="px-4 py-0">
          {/* Mobile: compact 2-row */}
          <div className="lg:hidden space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>
                <span className="text-muted-foreground text-xs">Total: </span>
                <span className="font-semibold">{assessment.totalMarks}</span>
              </span>
              <span>
                <span className="text-muted-foreground text-xs">Pass: </span>
                <span className="font-semibold">{assessment.passMark}</span>
              </span>
              {classAverage !== null && (
                <span>
                  <span className="text-muted-foreground text-xs">Avg: </span>
                  <span className="font-semibold">{classAverage}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex-1">
                {enteredCount} / {students.length} entered
              </span>
              {showAutoSaveSuccess && (
                <CheckCircle2 className="h-4 w-4 text-green-600 animate-in fade-in zoom-in duration-200" />
              )}
              <Badge variant="outline" className="text-xs">
                {students.length > 0 ? Math.round((enteredCount / students.length) * 100) : 0}%
              </Badge>
              <Badge variant={EXAM_BADGE[assessment.examType] ?? "default"} className="text-xs">
                {EXAM_LABELS[assessment.examType] ?? assessment.examType}
              </Badge>
            </div>
          </div>

          {/* Desktop: single horizontal row */}
          <div className="hidden lg:flex items-center justify-between flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-6">
              <span>
                <span className="text-muted-foreground text-xs">Total Marks: </span>
                <span className="font-semibold">{assessment.totalMarks}</span>
              </span>
              <span>
                <span className="text-muted-foreground text-xs">Pass Mark: </span>
                <span className="font-semibold">{assessment.passMark}</span>
              </span>
              {classAverage !== null && (
                <span>
                  <span className="text-muted-foreground text-xs">Class Avg: </span>
                  <span className="font-semibold">
                    {classAverage} / {assessment.totalMarks}
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({pct(parseFloat(classAverage), assessment.totalMarks)}%)
                    </span>
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {showAutoSaveSuccess && (
                <CheckCircle2 className="h-4 w-4 text-green-600 animate-in fade-in zoom-in duration-200" />
              )}
              <span className="text-xs text-muted-foreground">
                {enteredCount} / {students.length} entered
              </span>
              <Badge variant="outline" className="text-xs">
                {students.length > 0 ? Math.round((enteredCount / students.length) * 100) : 0}%
              </Badge>
              <Badge variant={EXAM_BADGE[assessment.examType] ?? "default"} className="text-xs">
                {EXAM_LABELS[assessment.examType] ?? assessment.examType}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Action bar ── */}
      <div className="flex items-center justify-between gap-2 px-4 lg:px-0">
        <Button
          variant="outline"
          size="sm"
          disabled={isDraft || unmarkedCount === 0}
          onClick={() => setShowFillZeroDialog(true)}
        >
          <Hash className="h-4 w-4 mr-1.5" />
          <span className="hidden lg:inline">Set 0 for unmarked</span>
          <span className="lg:hidden">Fill zeros</span>
          {unmarkedCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">
              {unmarkedCount}
            </Badge>
          )}
        </Button>

        <Button
          onClick={handleSaveAll}
          disabled={saving || enteredCount === 0 || isEntryBlocked}
          size="sm"
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? "Saving…" : "Save All"}
        </Button>
      </div>

      {/* ── Register ── */}
      <Card className="overflow-hidden rounded-none border-x-0 lg:rounded-lg lg:border-x">
        {/* Search bar */}
        <div className="px-4 py-2.5 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search students…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Column headers — desktop */}
        <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Student</div>
          <div className="col-span-3">Marks</div>
          <div className="col-span-2">%</div>
          <div className="col-span-2 text-right">
            <span title="Use the person-X icon to mark a student as Absent (AB)">Status · AB</span>
          </div>
        </div>
        {/* Column headers — mobile */}
        <div className="lg:hidden flex items-center px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div className="flex-1">Student</div>
          <div className="w-16 text-center shrink-0">Marks</div>
          <div className="w-[60px] shrink-0" />
        </div>

        {/* All students */}
        <div className="divide-y max-h-[calc(100svh-22rem)] lg:max-h-[calc(100vh-22rem)] overflow-y-auto">
          {students.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No students enrolled in this class.
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
              <Search className="h-6 w-6 opacity-20" />
              <p>No students match your search</p>
            </div>
          ) : (
            filteredStudents.map((student, index) => {
              const result = results[student.id];
              const isAbsent = result?.isAbsent ?? false;
              const rawMarks = result?.marksObtained;
              const marksNum =
                !isAbsent && rawMarks !== undefined && rawMarks !== ""
                  ? typeof rawMarks === "string"
                    ? parseFloat(rawMarks)
                    : rawMarks
                  : null;
              const percentage = marksNum !== null && !isNaN(marksNum)
                ? pct(marksNum, assessment.totalMarks)
                : null;
              const passing = marksNum !== null && !isNaN(marksNum)
                ? marksNum >= assessment.passMark
                : null;
              const hasRemark = !!result?.remarks;
              const isRemarksOpen = openRemarks.has(student.id);

              return (
                <div key={student.id}>

                  {/* ── Mobile row ── */}
                  <div className={cn(
                    "lg:hidden flex items-center gap-3 px-4 py-3.5 transition-colors",
                    isAbsent ? "bg-amber-50/60 dark:bg-amber-950/20" : "hover:bg-muted/20",
                  )}>
                    {/* Name + percentage on second line */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm truncate leading-tight",
                        isAbsent ? "text-amber-700 dark:text-amber-400" : "",
                      )}>
                        {student.firstName}{student.middleName ? ` ${student.middleName}` : ""} {student.lastName}
                      </p>
                      {isAbsent ? (
                        <p className="text-xs text-amber-600 mt-0.5">Absent</p>
                      ) : percentage !== null ? (
                        <p className={cn(
                          "text-xs mt-0.5 font-medium",
                          passing ? "text-green-600" : "text-destructive",
                        )}>
                          {percentage}% · {passing ? "Pass" : "Fail"}
                        </p>
                      ) : null}
                    </div>

                    {/* Mark input or AB badge */}
                    <div className="shrink-0 w-16">
                      {isAbsent ? (
                        <div className="h-9 w-16 flex items-center justify-center rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">AB</span>
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          max={assessment.totalMarks}
                          step="1"
                          placeholder="—"
                          value={rawMarks ?? ""}
                          onChange={e => handleMarksChange(student.id, e.target.value)}
                          onBlur={e => handleMarksBlur(student.id, e.target.value)}
                          disabled={isEntryBlocked}
                          className="h-9 w-16 text-center tabular-nums text-sm"
                        />
                      )}
                    </div>

                    {/* Controls: save state · AB · remarks */}
                    <div className="flex items-center gap-1.5 shrink-0 w-[60px] justify-end">
                      {savingStudentId === student.id ? (
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      ) : result?.id ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                      <button
                        onClick={() => handleToggleAbsent(student.id)}
                        title={isAbsent ? "Remove absent mark" : "Mark as absent (AB)"}
                        disabled={isDraft}
                        className={cn(
                          "rounded p-0.5 transition-colors",
                          isAbsent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:text-amber-600",
                        )}
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleRemarks(student.id)}
                        title={isRemarksOpen ? "Hide remarks" : "Add remark"}
                        className={cn(
                          "rounded p-0.5 transition-colors",
                          isRemarksOpen || hasRemark ? "text-primary" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* ── Desktop row ── */}
                  <div className={cn(
                    "hidden lg:grid grid-cols-12 gap-3 px-4 py-3 items-center transition-colors",
                    isAbsent ? "bg-amber-50/60 dark:bg-amber-950/20" : "hover:bg-muted/20",
                  )}>
                    <div className="col-span-1 text-xs text-muted-foreground font-mono">
                      {index + 1}
                    </div>
                    <div className="col-span-4 min-w-0">
                      <p className={cn("font-medium text-sm truncate leading-tight", isAbsent ? "text-amber-700 dark:text-amber-400" : "")}>
                        {student.firstName}{student.middleName ? ` ${student.middleName}` : ""} {student.lastName}
                      </p>
                    </div>
                    <div className="col-span-3">
                      {isAbsent ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400">
                          <UserX className="h-3.5 w-3.5" />AB
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Input
                            ref={el => { inputRefs.current[index] = el; }}
                            type="number"
                            min="0"
                            max={assessment.totalMarks}
                            step="1"
                            placeholder="—"
                            value={rawMarks ?? ""}
                            onChange={e => handleMarksChange(student.id, e.target.value)}
                            onBlur={e => handleMarksBlur(student.id, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, index)}
                            disabled={isEntryBlocked}
                            className="h-8 text-sm w-20 tabular-nums"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            / {assessment.totalMarks}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-sm tabular-nums">
                      {isAbsent ? (
                        <span className="text-amber-500 text-xs font-medium">Absent</span>
                      ) : percentage !== null ? (
                        <span className={percentage >= pct(assessment.passMark, assessment.totalMarks) ? "text-green-700 font-medium" : "text-destructive font-medium"}>
                          {percentage}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      {!isAbsent && passing !== null && (
                        <Badge variant={passing ? "default" : "destructive"} className="text-xs px-1.5 py-0">
                          {passing ? "Pass" : "Fail"}
                        </Badge>
                      )}
                      {savingStudentId === student.id ? (
                        <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
                      ) : result?.id ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      ) : null}
                      <button
                        onClick={() => handleToggleAbsent(student.id)}
                        title={isAbsent ? "Remove absent mark" : "Mark as absent (AB)"}
                        disabled={isDraft}
                        className={cn("rounded p-0.5 transition-colors", isAbsent ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:text-amber-600")}
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleRemarks(student.id)}
                        title={isRemarksOpen ? "Hide remarks" : "Add remark"}
                        className={cn("rounded p-0.5 transition-colors", isRemarksOpen || hasRemark ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Remarks row — shared, visible when toggled */}
                  {isRemarksOpen && (
                    <div className="px-4 pb-3 -mt-1 bg-muted/10">
                      <Textarea
                        placeholder="Remark (e.g. absent, medical, extra credit…)"
                        value={result?.remarks ?? ""}
                        onChange={e => handleRemarksChange(student.id, e.target.value)}
                        disabled={isDraft}
                        rows={2}
                        className="text-xs resize-none"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* ── Keyboard hint — desktop only ── */}
      {students.length > 0 && !isDraft && (
        <p className="hidden lg:block text-xs text-muted-foreground text-center pb-2">
          Press <kbd className="px-1 py-0.5 rounded bg-muted border text-xs font-mono">Enter</kbd> or{" "}
          <kbd className="px-1 py-0.5 rounded bg-muted border text-xs font-mono">↓</kbd> to move to the next student &nbsp;·&nbsp;{" "}
          <kbd className="px-1 py-0.5 rounded bg-muted border text-xs font-mono">↑</kbd> to go back
        </p>
      )}

      {/* ── Blocking window dialog (closed / not configured) ── */}
      <AlertDialog open={blockingWindowOpen}>
        <AlertDialogContent
          onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
          className="max-w-sm text-center"
        >
          <AlertDialogHeader className="items-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center">
              {windowState === "not_configured"
                ? "Entry Window Not Configured"
                : "Entry Window Closed"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {windowState === "not_configured"
                ? "The admin has not set an entry window for this exam type. Result entry is locked until a window is configured."
                : windowData
                ? <>The entry window for this assessment closed on <strong>{fmtDate(windowData.closesAt)}</strong>. Results are locked.</>
                : "The entry window for this assessment has closed. Results are locked."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center sm:justify-center">
            <AlertDialogAction
              className="w-full sm:w-auto"
              onClick={() => router.push("/teacher/assessments")}
            >
              Go Back to Assessments
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Fill-zeros confirmation dialog ── */}
      <AlertDialog open={showFillZeroDialog} onOpenChange={setShowFillZeroDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set 0 for unmarked students?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set a mark of <strong>0</strong> for the{" "}
              <strong>{unmarkedCount}</strong> student{unmarkedCount !== 1 ? "s" : ""} who
              have no mark entered yet. Already-entered marks will not be changed.
              You can still edit individual marks after.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={fillZeroForUnmarked}>
              Set 0 for {unmarkedCount} student{unmarkedCount !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
