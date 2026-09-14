"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  RefreshCw,
  Search,
  MoreVertical,
  CheckCircle2,
  Send,
  FileText,
  AlertTriangle,
  CalendarClock,
  Plus,
  Trash2,
  Pencil,
  Lock,
  Unlock,
  Clock,
  RotateCcw,
} from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { toast } from "sonner";
import { cn, formatCompactClassLabel } from "@/lib/utils";
import { useMobileHeaderRefresh } from "@/hooks/useMobileHeaderRefresh";

// ── Types ──────────────────────────────────────────────────────────────────────

type AssessmentStatus = "DRAFT" | "PUBLISHED" | "COMPLETED";
type ExamType = "CAT" | "MID" | "EOT";

interface Assessment {
  id: string;
  title: string;
  examType: ExamType;
  status: AssessmentStatus;
  totalMarks: number;
  dueDate: string | null;
  subject: { id: string; name: string; code: string };
  class: { id: string; name: string; grade?: { name: string } };
  term: { id: string; termType: string; academicYear?: { year: number } };
  _count?: { results: number };
}

interface AssessmentWindow {
  id: string;
  termId: string;
  examType: ExamType;
  opensAt: string;
  closesAt: string;
  term: { id: string; termType: string; academicYear?: { year: number } };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_VARIANTS: Record<AssessmentStatus, { label: string; class: string }> = {
  DRAFT:     { label: "Draft",     class: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  PUBLISHED: { label: "Published", class: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  COMPLETED: { label: "Completed", class: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
};

const EXAM_LABELS: Record<ExamType, string> = {
  CAT: "CAT 1",
  MID: "Mid-Term",
  EOT: "End of Term",
};

function formatTermLabel(termType: string): string {
  return termType.replace(/^TERM_(\d+)$/, (_, n) => `Term ${n}`);
}

// Form-grade classes are already named "F1 Blue", "F2-A", etc. — self
// identifying. Anything else gets the grade's number prefixed instead
// (e.g. "Grade 10" + "A" -> "10 A"). Mobile-only compact class label.
function windowState(w: AssessmentWindow): "before_open" | "open" | "closed" {
  const now = Date.now();
  if (now < new Date(w.opensAt).getTime()) return "before_open";
  if (now <= new Date(w.closesAt).getTime()) return "open";
  return "closed";
}

function toLocalInputValue(iso: string) {
  // Convert ISO string to datetime-local input format (YYYY-MM-DDTHH:MM)
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Window badge ───────────────────────────────────────────────────────────────

function WindowStateBadge({ state }: { state: "before_open" | "open" | "closed" }) {
  if (state === "open") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400">
      <Unlock className="h-3 w-3" /> Open
    </span>
  );
  if (state === "before_open") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
      <Clock className="h-3 w-3" /> Upcoming
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
      <Lock className="h-3 w-3" /> Closed
    </span>
  );
}

// ── Window dialog ──────────────────────────────────────────────────────────────

interface WindowDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  terms: Array<{ id: string; termType: string; academicYear?: { year: number } }>;
  editing: AssessmentWindow | null;
  onSaved: () => void;
}

function WindowDialog({ open, onOpenChange, terms, editing, onSaved }: WindowDialogProps) {
  const tok = () => typeof window !== "undefined" ? localStorage.getItem("auth_token") ?? "" : "";

  const [termId, setTermId] = useState("");
  const [examType, setExamType] = useState<ExamType | "">("");
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setTermId(editing.termId);
      setExamType(editing.examType);
      setOpensAt(toLocalInputValue(editing.opensAt));
      setClosesAt(toLocalInputValue(editing.closesAt));
    } else {
      setTermId(""); setExamType(""); setOpensAt(""); setClosesAt("");
    }
  }, [editing, open]);

  const handleSave = async () => {
    if (!termId || !examType || !opensAt || !closesAt) {
      toast.error("All fields are required."); return;
    }
    if (new Date(closesAt) <= new Date(opensAt)) {
      toast.error("Close date must be after open date."); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/assessment-windows", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ termId, examType, opensAt: new Date(opensAt).toISOString(), closesAt: new Date(closesAt).toISOString() }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(editing ? "Window updated." : "Window created.");
        onSaved();
        onOpenChange(false);
      } else {
        toast.error(d.error || "Failed to save window.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Entry Window" : "Create Entry Window"}</DialogTitle>
          <DialogDescription>
            Set when teachers can publish assessments and enter results for a given exam type and term.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Term <span className="text-destructive">*</span></Label>
              <Select value={termId} onValueChange={setTermId} disabled={!!editing}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {formatTermLabel(t.termType)}{t.academicYear ? ` · ${t.academicYear.year}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Exam Type <span className="text-destructive">*</span></Label>
              <Select value={examType} onValueChange={(v) => setExamType(v as ExamType)} disabled={!!editing}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAT">CAT 1</SelectItem>
                  <SelectItem value="MID">Mid-Term</SelectItem>
                  <SelectItem value="EOT">End of Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Opens At <span className="text-destructive">*</span></Label>
            <Input type="datetime-local" className="h-9" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Closes At <span className="text-destructive">*</span></Label>
            <Input type="datetime-local" className="h-9" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminAssessmentsPage() {
  const tok = () => typeof window !== "undefined" ? localStorage.getItem("auth_token") ?? "" : "";

  // ── Assessments tab state ──
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classes, setClasses] = useState<Array<{ id: string; name: string; grade?: { name: string } }>>([]);
  const [terms, setTerms] = useState<Array<{ id: string; termType: string; academicYear?: { year: number } }>>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | "all">("all");
  const [examTypeFilter, setExamTypeFilter] = useState<ExamType | "all">("all");
  const [page, setPage] = useState(1);
  const [actionTarget, setActionTarget] = useState<Assessment | null>(null);
  const [actionType, setActionType] = useState<"publish" | "complete" | "reopen" | null>(null);
  const [actioning, setActioning] = useState(false);

  // Mobile-only: which of the row-one filters is currently focused/open.
  const [activeMobileFilter, setActiveMobileFilter] = useState<
    "search" | "class" | "term" | "examType" | "status" | null
  >(null);

  // ── Windows tab state ──
  const [windows, setWindows] = useState<AssessmentWindow[]>([]);
  const [windowsLoading, setWindowsLoading] = useState(false);
  const [windowDialogOpen, setWindowDialogOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<AssessmentWindow | null>(null);
  const [deleteWindowTarget, setDeleteWindowTarget] = useState<AssessmentWindow | null>(null);
  const [deletingWindow, setDeletingWindow] = useState(false);

  const loadFilters = useCallback(async () => {
    const [cl, tr] = await Promise.all([
      fetch("/api/classes?mode=all&pageSize=100", { headers: { Authorization: `Bearer ${tok()}` } }).then((r) => r.json()),
      fetch("/api/terms?pageSize=50", { headers: { Authorization: `Bearer ${tok()}` } }).then((r) => r.json()),
    ]);
    setClasses(cl.data ?? []);
    setTerms(tr.data ?? []);
  }, []);

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: "20" });
      if (classFilter !== "all") params.set("classId", classFilter);
      if (termFilter !== "all") params.set("termId", termFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (examTypeFilter !== "all") params.set("examType", examTypeFilter);
      const res = await fetch(`/api/assessments?${params}`, { headers: { Authorization: `Bearer ${tok()}` } });
      const d = await res.json();
      if (res.ok) { setAssessments(d.data ?? []); setMeta(d.meta ?? { total: 0, page: 1, pageSize: 20, totalPages: 0 }); }
    } finally { setLoading(false); }
  }, [classFilter, termFilter, statusFilter, examTypeFilter, page]);

  const loadWindows = useCallback(async () => {
    setWindowsLoading(true);
    try {
      const res = await fetch("/api/admin/assessment-windows", { headers: { Authorization: `Bearer ${tok()}` } });
      const d = await res.json();
      if (res.ok) setWindows(d.data ?? []);
    } finally { setWindowsLoading(false); }
  }, []);

  useEffect(() => { loadFilters(); }, [loadFilters]);
  useEffect(() => { loadAssessments(); }, [loadAssessments]);
  useEffect(() => { loadWindows(); }, [loadWindows]);

  // On mobile, refresh lives as an icon next to the notification bell in the
  // layout's header instead of the inline "Refresh" button below.
  useMobileHeaderRefresh(loadAssessments, loading);

  const handleAction = async () => {
    if (!actionTarget || !actionType) return;
    setActioning(true);
    try {
      const res = await fetch(`/api/assessments/${actionTarget.id}/${actionType}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
      });
      const d = await res.json();
      if (res.ok) {
        toast.success(
          actionType === "publish"
            ? "Assessment published."
            : actionType === "complete"
            ? "Assessment marked as completed."
            : "Assessment reopened."
        );
        loadAssessments();
      } else {
        toast.error(d.error || "Action failed.");
      }
    } finally {
      setActioning(false); setActionTarget(null); setActionType(null);
    }
  };

  const handleDeleteWindow = async () => {
    if (!deleteWindowTarget) return;
    setDeletingWindow(true);
    try {
      const res = await fetch(`/api/admin/assessment-windows/${deleteWindowTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tok()}` },
      });
      if (res.ok) { toast.success("Window deleted."); loadWindows(); }
      else { const d = await res.json(); toast.error(d.error || "Failed to delete window."); }
    } finally { setDeletingWindow(false); setDeleteWindowTarget(null); }
  };

  const hasFilters = classFilter !== "all" || termFilter !== "all" || statusFilter !== "all" || examTypeFilter !== "all";
  const filtered = search.trim()
    ? assessments.filter((a) => `${a.title} ${a.subject.name} ${a.class.name}`.toLowerCase().includes(search.toLowerCase()))
    : assessments;

  return (
    <div className="space-y-5 px-4 lg:px-0">
      {/* Header — desktop only; mobile top bar handles the title */}
      <div className="hidden lg:flex items-center justify-between mt-2">
        <div>
          <h1 className="text-xl font-bold">Assessments</h1>
          <p className="text-sm text-muted-foreground">
            Manage entry windows and oversee assessments across all classes
          </p>
        </div>
      </div>

      <Tabs defaultValue="assessments">
        <div className="mt-5 lg:mt-0">
          <TabsList className="w-full lg:w-fit">
            <TabsTrigger value="assessments" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Assessments
            </TabsTrigger>
            <TabsTrigger value="windows" className="gap-2">
              <CalendarClock className="h-4 w-4" /> Entry Windows
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Assessments tab ── */}
        <TabsContent value="assessments" className="space-y-4 mt-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Assessments must be <strong>Completed</strong> before report cards can include their marks.
              Teachers can only publish once the entry window for that exam type is open.
            </p>
          </div>

          <Card>
            <CardContent className="py-4">
              {/* ── Mobile filters: search on its own row; class/term share
                  row two, exam type/status share row three — each pair
                  content-based grow/shrink on focus. ────────────────────── */}
              <div className="flex flex-col gap-2 lg:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input placeholder="Search assessments..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <div className={cn("min-w-0 transition-all duration-200", activeMobileFilter === "class" ? "flex-none max-w-[70%]" : "flex-1")}>
                    <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1); }} onOpenChange={(open) => setActiveMobileFilter(open ? "class" : null)}>
                      <SelectTrigger className={cn("h-9", activeMobileFilter === "class" ? "w-fit max-w-full" : "w-full")}><SelectValue placeholder="Class" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map((c) => <SelectItem key={c.id} value={c.id}>{formatCompactClassLabel(c.grade?.name, c.name)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={cn("min-w-0 transition-all duration-200", activeMobileFilter === "term" ? "flex-none max-w-[70%]" : "flex-1")}>
                    <Select value={termFilter} onValueChange={(v) => { setTermFilter(v); setPage(1); }} onOpenChange={(open) => setActiveMobileFilter(open ? "term" : null)}>
                      <SelectTrigger className={cn("h-9", activeMobileFilter === "term" ? "w-fit max-w-full" : "w-full")}><SelectValue placeholder="Term" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Terms</SelectItem>
                        {terms.map((t) => <SelectItem key={t.id} value={t.id}>{formatTermLabel(t.termType)}{t.academicYear ? ` · ${t.academicYear.year}` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className={cn("min-w-0 transition-all duration-200", activeMobileFilter === "examType" ? "flex-none max-w-[70%]" : "flex-1")}>
                    <Select value={examTypeFilter} onValueChange={(v) => { setExamTypeFilter(v as ExamType | "all"); setPage(1); }} onOpenChange={(open) => setActiveMobileFilter(open ? "examType" : null)}>
                      <SelectTrigger className={cn("h-9", activeMobileFilter === "examType" ? "w-fit max-w-full" : "w-full")}><SelectValue placeholder="Exam Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="CAT">CAT 1</SelectItem>
                        <SelectItem value="MID">Mid-Term</SelectItem>
                        <SelectItem value="EOT">End of Term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={cn("min-w-0 transition-all duration-200", activeMobileFilter === "status" ? "flex-none max-w-[70%]" : "flex-1")}>
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as AssessmentStatus | "all"); setPage(1); }} onOpenChange={(open) => setActiveMobileFilter(open ? "status" : null)}>
                      <SelectTrigger className={cn("h-9", activeMobileFilter === "status" ? "w-fit max-w-full" : "w-full")}><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="PUBLISHED">Published</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {hasFilters && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground self-start" onClick={() => { setClassFilter("all"); setTermFilter("all"); setStatusFilter("all"); setExamTypeFilter("all"); setPage(1); }}>
                    Clear filters
                  </Button>
                )}
              </div>

              {/* ── Desktop filters — unchanged ─────────────────────────── */}
              <div className="hidden lg:flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input placeholder="Search assessments..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{formatCompactClassLabel(c.grade?.name, c.name)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={termFilter} onValueChange={(v) => { setTermFilter(v); setPage(1); }}>
                  <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Term" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    {terms.map((t) => <SelectItem key={t.id} value={t.id}>{formatTermLabel(t.termType)}{t.academicYear ? ` · ${t.academicYear.year}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={examTypeFilter} onValueChange={(v) => { setExamTypeFilter(v as ExamType | "all"); setPage(1); }}>
                  <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Exam Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="CAT">CAT 1</SelectItem>
                    <SelectItem value="MID">Mid-Term</SelectItem>
                    <SelectItem value="EOT">End of Term</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as AssessmentStatus | "all"); setPage(1); }}>
                  <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setClassFilter("all"); setTermFilter("all"); setStatusFilter("all"); setExamTypeFilter("all"); setPage(1); }}>
                    Clear filters
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={loadAssessments} disabled={loading} className="ml-auto">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <>
                  {/* Mobile skeleton — mirrors the tappable card rows below */}
                  <div className="lg:hidden divide-y">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3 p-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                      </div>
                    ))}
                  </div>
                  {/* Desktop skeleton — mirrors the table columns */}
                  <div className="hidden lg:block p-6 space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-20 rounded-full ml-auto" />
                      </div>
                    ))}
                  </div>
                </>
              ) : filtered.length === 0 ? (
                <Empty className="py-20">
                  <EmptyContent>
                    <EmptyMedia variant="icon"><ClipboardList className="h-6 w-6" /></EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>No assessments found</EmptyTitle>
                      <EmptyDescription>{hasFilters ? "Try adjusting your filters" : "Assessments are created by teachers from the Teacher portal"}</EmptyDescription>
                    </EmptyHeader>
                  </EmptyContent>
                </Empty>
              ) : (
                <>
                  {/* ── Mobile: tappable card rows — subject code instead of
                      name, class grade-prefixed unless it's already a Form
                      name. ─────────────────────────────────────────────── */}
                  <div className="lg:hidden divide-y">
                    {filtered.map((a) => {
                      const statusInfo = STATUS_VARIANTS[a.status];
                      return (
                        <div key={a.id} className="flex items-start gap-3 p-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm truncate">{a.title}</p>
                              <span className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium shrink-0 ${statusInfo.class}`}>{statusInfo.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {a.subject.code} · {formatCompactClassLabel(a.class.grade?.name, a.class.name)} · {EXAM_LABELS[a.examType]}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {a.totalMarks} marks · {a._count?.results ?? 0} results
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {a.status === "DRAFT" && (
                                <DropdownMenuItem onClick={() => { setActionTarget(a); setActionType("publish"); }}>
                                  <Send className="h-4 w-4 mr-2 text-blue-500" />Publish
                                </DropdownMenuItem>
                              )}
                              {a.status === "PUBLISHED" && (
                                <>
                                  <DropdownMenuItem onClick={() => { setActionTarget(a); setActionType("complete"); }}>
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />Mark as Completed
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                                    <FileText className="h-4 w-4 mr-2" />{a._count?.results ?? 0} result{a._count?.results !== 1 ? "s" : ""} entered
                                  </DropdownMenuItem>
                                </>
                              )}
                              {a.status === "COMPLETED" && (
                                <>
                                  <DropdownMenuItem onClick={() => { setActionTarget(a); setActionType("reopen"); }}>
                                    <RotateCcw className="h-4 w-4 mr-2 text-amber-500" />Reopen
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />Finalised — included in report cards
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Desktop: full table — unchanged ─────────────────── */}
                  <Table className="hidden lg:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assessment</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">Marks</TableHead>
                        <TableHead className="text-center">Results</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((a) => {
                        const statusInfo = STATUS_VARIANTS[a.status];
                        return (
                          <TableRow key={a.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{a.title}</p>
                                <p className="text-xs text-muted-foreground">{a.subject.name}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <p className="font-medium">{a.class.name}</p>
                              <p className="text-xs text-muted-foreground">{a.class.grade?.name}</p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatTermLabel(a.term.termType)}{a.term.academicYear && ` · ${a.term.academicYear.year}`}
                            </TableCell>
                            <TableCell><span className="text-sm">{EXAM_LABELS[a.examType]}</span></TableCell>
                            <TableCell className="text-center text-sm">{a.totalMarks}</TableCell>
                            <TableCell className="text-center"><span className="text-sm font-medium tabular-nums">{a._count?.results ?? 0}</span></TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusInfo.class}`}>{statusInfo.label}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {a.status === "DRAFT" && (
                                    <DropdownMenuItem onClick={() => { setActionTarget(a); setActionType("publish"); }}>
                                      <Send className="h-4 w-4 mr-2 text-blue-500" />Publish
                                    </DropdownMenuItem>
                                  )}
                                  {a.status === "PUBLISHED" && (
                                    <>
                                      <DropdownMenuItem onClick={() => { setActionTarget(a); setActionType("complete"); }}>
                                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />Mark as Completed
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                                        <FileText className="h-4 w-4 mr-2" />{a._count?.results ?? 0} result{a._count?.results !== 1 ? "s" : ""} entered
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {a.status === "COMPLETED" && (
                                    <>
                                      <DropdownMenuItem onClick={() => { setActionTarget(a); setActionType("reopen"); }}>
                                        <RotateCcw className="h-4 w-4 mr-2 text-amber-500" />Reopen
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />Finalised — included in report cards
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
            {!loading && filtered.length > 0 && meta.totalPages > 1 && (
              <div className="border-t px-4 py-3 flex items-center justify-end gap-4">
                <p className="text-sm text-muted-foreground">
                  {(meta.page - 1) * meta.pageSize + 1}–{Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total}
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Entry Windows tab ── */}
        <TabsContent value="windows" className="space-y-4 mt-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 px-4 py-3 flex-1 lg:mr-4">
              <CalendarClock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Entry windows control when teachers can publish assessments and enter results.
                Each window is scoped to a <strong>term + exam type</strong> combination.
                Teachers can draft assessments at any time, but can only publish within the open window.
              </p>
            </div>
            <Button onClick={() => { setEditingWindow(null); setWindowDialogOpen(true); }} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />New Window
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {windowsLoading ? (
                <>
                  {/* Mobile skeleton — mirrors the card rows below */}
                  <div className="lg:hidden divide-y">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 p-3">
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-3 w-44" />
                          <Skeleton className="h-4 w-16 rounded" />
                        </div>
                        <Skeleton className="h-8 w-16 rounded-md shrink-0" />
                      </div>
                    ))}
                  </div>
                  {/* Desktop skeleton — mirrors the table columns */}
                  <div className="hidden lg:block p-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-40" /><Skeleton className="h-5 w-20 rounded-full ml-auto" />
                      </div>
                    ))}
                  </div>
                </>
              ) : windows.length === 0 ? (
                <Empty className="py-20">
                  <EmptyContent>
                    <EmptyMedia variant="icon"><CalendarClock className="h-6 w-6" /></EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>No entry windows configured</EmptyTitle>
                      <EmptyDescription>Create a window to allow teachers to publish and enter results</EmptyDescription>
                    </EmptyHeader>
                  </EmptyContent>
                </Empty>
              ) : (
                <>
                  {/* ── Mobile: card rows ────────────────────────────────── */}
                  <div className="lg:hidden divide-y">
                    {windows.map((w) => {
                      const state = windowState(w);
                      return (
                        <div key={w.id} className="flex items-start justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {formatTermLabel(w.term.termType)}{w.term.academicYear ? ` · ${w.term.academicYear.year}` : ""} · {EXAM_LABELS[w.examType]}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(w.opensAt).toLocaleDateString()} – {new Date(w.closesAt).toLocaleDateString()}
                            </p>
                            <div className="mt-1.5"><WindowStateBadge state={state} /></div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingWindow(w); setWindowDialogOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteWindowTarget(w)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Desktop: full table — unchanged ─────────────────── */}
                  <Table className="hidden lg:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Term</TableHead>
                        <TableHead>Exam Type</TableHead>
                        <TableHead>Opens At</TableHead>
                        <TableHead>Closes At</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {windows.map((w) => {
                        const state = windowState(w);
                        return (
                          <TableRow key={w.id}>
                            <TableCell className="text-sm font-medium">
                              {formatTermLabel(w.term.termType)}{w.term.academicYear ? ` · ${w.term.academicYear.year}` : ""}
                            </TableCell>
                            <TableCell><span className="text-sm">{EXAM_LABELS[w.examType]}</span></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(w.opensAt).toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(w.closesAt).toLocaleString()}</TableCell>
                            <TableCell><WindowStateBadge state={state} /></TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingWindow(w); setWindowDialogOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteWindowTarget(w)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Assess action dialog */}
      <AlertDialog open={!!actionTarget} onOpenChange={(open) => { if (!open) { setActionTarget(null); setActionType(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${actionType === "complete" ? "bg-green-100" : actionType === "reopen" ? "bg-amber-100" : "bg-blue-100"}`}>
                {actionType === "complete" ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : actionType === "reopen" ? <RotateCcw className="h-5 w-5 text-amber-600" /> : <Send className="h-5 w-5 text-blue-600" />}
              </div>
              <AlertDialogTitle>{actionType === "publish" ? "Publish Assessment" : actionType === "complete" ? "Mark as Completed" : "Reopen Assessment"}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-2">
              {actionType === "publish"
                ? `Publish "${actionTarget?.title}" to allow teachers to enter results.`
                : actionType === "complete"
                ? `Mark "${actionTarget?.title}" as completed. This finalises all marks for report cards.`
                : `Reopen "${actionTarget?.title}" for editing. It will return to Published status and can be marked complete again once corrected.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={actioning} className={actionType === "complete" ? "bg-green-600 hover:bg-green-700" : actionType === "reopen" ? "bg-amber-600 hover:bg-amber-700" : ""}>
              {actioning ? "Processing..." : actionType === "publish" ? "Publish" : actionType === "complete" ? "Mark Completed" : "Reopen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete window dialog */}
      <AlertDialog open={!!deleteWindowTarget} onOpenChange={(open) => { if (!open) setDeleteWindowTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle>Delete Entry Window</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-3">
              Delete the <strong>{deleteWindowTarget ? EXAM_LABELS[deleteWindowTarget.examType] : ""}</strong> window for{" "}
              <strong>{deleteWindowTarget ? formatTermLabel(deleteWindowTarget.term.termType) : ""}</strong>?
              Teachers will no longer be able to publish assessments for this exam type and term.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWindow} disabled={deletingWindow} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingWindow ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Window create/edit dialog */}
      <WindowDialog
        open={windowDialogOpen}
        onOpenChange={setWindowDialogOpen}
        terms={terms}
        editing={editingWindow}
        onSaved={loadWindows}
      />
    </div>
  );
}
