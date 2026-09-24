"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Search,
  Send,
  Users,
  PhoneOff,
} from "lucide-react";
import { toast } from "sonner";

type ExamType = "CAT" | "MID" | "EOT";
type Provider = "SMS_GATEWAY" | "AFRICAS_TALKING";

const EXAM_LABELS: Record<ExamType, string> = {
  CAT: "CAT 1",
  MID: "Mid-Term",
  EOT: "End of Term",
};

function formatTermLabel(termType: string): string {
  return termType.replace(/^TERM_(\d+)$/, (_, n) => `Term ${n}`);
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  hasPhone: boolean;
}

interface NotifyParentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotifyParentsDialog({ open, onOpenChange }: NotifyParentsDialogProps) {
  const tok = () =>
    typeof window !== "undefined" ? localStorage.getItem("auth_token") ?? "" : "";

  const [grades, setGrades] = useState<Array<{ id: string; name: string }>>([]);
  const [classes, setClasses] = useState<
    Array<{ id: string; name: string; gradeId: string; grade?: { name: string } }>
  >([]);
  const [terms, setTerms] = useState<
    Array<{ id: string; termType: string; academicYear?: { year: number } }>
  >([]);
  const [activeProvider, setActiveProvider] = useState<Provider>("SMS_GATEWAY");

  const [selectedGradeId, setSelectedGradeId] = useState("ALL");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [selectedExamType, setSelectedExamType] = useState<ExamType | "">("");

  // Recipients state
  const [students, setStudents] = useState<Student[]>([]);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");

  const [confirmStep, setConfirmStep] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    noPhone: number;
    message?: string;
  } | null>(null);

  const filteredClasses = classes.filter(
    (c) => selectedGradeId === "ALL" || c.gradeId === selectedGradeId
  );

  const visibleStudents = recipientSearch.trim()
    ? students.filter((s) => {
        const q = recipientSearch.toLowerCase();
        return (
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.studentNumber.toLowerCase().includes(q)
        );
      })
    : students;

  // Load reference data
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/grade-levels", { headers: { Authorization: `Bearer ${tok()}` } }).then((r) =>
        r.json()
      ),
      fetch("/api/classes?mode=all", { headers: { Authorization: `Bearer ${tok()}` } }).then((r) =>
        r.json()
      ),
      fetch("/api/terms", { headers: { Authorization: `Bearer ${tok()}` } }).then((r) => r.json()),
      fetch("/api/admin/settings/sms", { headers: { Authorization: `Bearer ${tok()}` } }).then(
        (r) => r.json()
      ),
    ])
      .then(([gr, cl, tr, sms]) => {
        setGrades(gr.data?.map((g: any) => ({ id: g.id, name: g.name })) ?? []);
        setClasses(
          cl.data?.map((c: any) => ({
            id: c.id,
            name: c.name,
            gradeId: c.gradeId,
            grade: c.grade,
          })) ?? []
        );
        setTerms(tr.data ?? []);
        if (sms.data?.activeProvider) setActiveProvider(sms.data.activeProvider);
      })
      .catch(() => null);
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedGradeId("ALL");
      setSelectedClassId("");
      setSelectedTermId("");
      setSelectedExamType("");
      setStudents([]);
      setExcludedIds(new Set());
      setRecipientSearch("");
      setConfirmStep(false);
      setResult(null);
    }
  }, [open]);

  // Fetch student list whenever class/term/examType are all set
  useEffect(() => {
    if (!selectedClassId || !selectedTermId || !selectedExamType) {
      setStudents([]);
      setExcludedIds(new Set());
      setRecipientSearch("");
      setConfirmStep(false);
      setResult(null);
      return;
    }
    setLoadingStudents(true);
    setRecipientSearch("");
    setConfirmStep(false);
    setResult(null);
    fetch(
      `/api/sms/assessment-notify?classId=${selectedClassId}&termId=${selectedTermId}&examType=${selectedExamType}&detail=true`,
      { headers: { Authorization: `Bearer ${tok()}` } }
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.students) {
          setStudents(d.data.students);
          setExcludedIds(new Set());
        }
      })
      .catch(() => null)
      .finally(() => setLoadingStudents(false));
  }, [selectedClassId, selectedTermId, selectedExamType]);

  const selectedTerm = terms.find((t) => t.id === selectedTermId);

  const includedStudents = students.filter((s) => !excludedIds.has(s.id));
  const reachableCount = includedStudents.filter((s) => s.hasPhone).length;

  const toggleExclude = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const targetIds = visibleStudents.map((s) => s.id);
    const allVisibleIncluded = targetIds.every((id) => !excludedIds.has(id));
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleIncluded) {
        targetIds.forEach((id) => next.add(id));
      } else {
        targetIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const allVisibleIncluded =
    visibleStudents.length > 0 && visibleStudents.every((s) => !excludedIds.has(s.id));

  const handleSend = async () => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/sms/assessment-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({
          classId: selectedClassId,
          termId: selectedTermId,
          examType: selectedExamType,
          provider: activeProvider,
          excludeStudentIds: Array.from(excludedIds),
        }),
      });
      const d = await res.json();
      if (res.ok) {
        const r = d.data;
        setResult(r);
        setConfirmStep(false);
        if (r.sent > 0) toast.success(`Sent ${r.sent} notifications`);
        else toast.info(r.message ?? "No messages were sent.");
      } else {
        toast.error(d.error || "Failed to send notifications.");
        setConfirmStep(false);
      }
    } finally {
      setSending(false);
    }
  };

  const canSend =
    selectedClassId &&
    selectedTermId &&
    selectedExamType &&
    students.length > 0 &&
    reachableCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notify Parents — Assessment Results
          </DialogTitle>
          <DialogDescription>
            Send each student&apos;s scores for a specific exam type directly to their parent&apos;s phone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-5 min-h-0">
          {/* ── Left panel: controls ── */}
          <div className="flex-1 min-w-80 space-y-4 py-2">
            {/* Grade + Class */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Grade (optional)</Label>
                <Select
                  value={selectedGradeId}
                  onValueChange={(v) => {
                    setSelectedGradeId(v);
                    setSelectedClassId("");
                  }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All grades</SelectItem>
                    {grades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Class <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Term + Exam Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Term <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {formatTermLabel(t.termType)}
                        {t.academicYear ? ` · ${t.academicYear.year}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Exam Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedExamType}
                  onValueChange={(v) => setSelectedExamType(v as ExamType)}>
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

            {/* Stats summary */}
            {students.length > 0 && !loadingStudents && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {includedStudents.length} of {students.length} student
                    {students.length !== 1 ? "s" : ""} selected
                  </span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-green-600 font-medium">
                    {reachableCount} parents reachable
                  </span>
                  {includedStudents.length - reachableCount > 0 && (
                    <span className="text-amber-600">
                      {includedStudents.length - reachableCount} have no phone
                    </span>
                  )}
                  {excludedIds.size > 0 && (
                    <span className="text-muted-foreground">
                      {excludedIds.size} excluded
                    </span>
                  )}
                </div>
                {students.length > 0 && reachableCount > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Message preview</p>
                    <p className="text-xs font-mono bg-background rounded px-2 py-1.5 border">
                      Dear [Parent], [Student]&apos;s{" "}
                      {selectedExamType ? EXAM_LABELS[selectedExamType] : ""} [
                      {selectedTerm
                        ? `${formatTermLabel(selectedTerm.termType)} · ${selectedTerm.academicYear?.year ?? ""}`
                        : ""}
                      ]: Eng: 82%, Math: 75%, Sci: 68%. - [School]
                    </p>
                  </div>
                )}
                {students.length > 0 && reachableCount === 0 && (
                  <p className="text-xs text-amber-600">
                    No parents reachable — check phone numbers or unexclude students.
                  </p>
                )}
              </div>
            )}

            {loadingStudents && (
              <div className="text-xs text-muted-foreground animate-pulse px-1">
                Loading recipients...
              </div>
            )}

            {/* Result */}
            {result && (
              <div
                className={`rounded-lg border p-3 flex items-start gap-3 ${
                  result.sent > 0
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                    : "bg-muted/30"
                }`}>
                {result.sent > 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="text-sm space-y-0.5">
                  {result.sent > 0 && (
                    <p className="font-medium text-green-700">
                      {result.sent} notification{result.sent !== 1 ? "s" : ""} sent
                    </p>
                  )}
                  {result.failed > 0 && (
                    <p className="text-red-600">{result.failed} failed to send</p>
                  )}
                  {result.noPhone > 0 && (
                    <p className="text-muted-foreground">
                      {result.noPhone} skipped (no phone number)
                    </p>
                  )}
                  {result.message && (
                    <p className="text-muted-foreground">{result.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Provider badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Sending via</span>
              <Badge variant="outline" className="text-xs">
                {activeProvider === "SMS_GATEWAY" ? "SMS Gateway" : "Africa's Talking"}
              </Badge>
            </div>

            <Separator />

            {/* Confirm / Send */}
            {confirmStep && !result ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-sm text-amber-800 dark:text-amber-300 flex-1">
                  Send {selectedExamType ? EXAM_LABELS[selectedExamType] : ""} results to{" "}
                  <strong>{reachableCount} parents</strong>?
                </span>
                <Button
                  onClick={handleSend}
                  disabled={sending}
                  size="sm"
                  className="h-7 text-xs bg-amber-600 hover:bg-amber-700">
                  {sending ? "Sending..." : "Confirm"}
                </Button>
                <button
                  onClick={() => setConfirmStep(false)}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0">
                  Cancel
                </button>
              </div>
            ) : !result ? (
              <Button onClick={handleSend} disabled={!canSend} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {reachableCount > 0
                  ? `Send to ${reachableCount} parent${reachableCount !== 1 ? "s" : ""}`
                  : "Send Notifications"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setConfirmStep(false);
                }}
                className="w-full">
                Send Another
              </Button>
            )}
          </div>

          {/* ── Right panel: Recipients ── */}
          <div className="w-[300px] shrink-0 flex flex-col border rounded-lg overflow-hidden h-[480px]">
            {/* Card header */}
            <div className="px-3 py-2.5 border-b bg-muted/30 flex items-center justify-between">
              <span className="text-sm font-semibold">Recipients</span>
              {students.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="text-xs text-muted-foreground hover:text-foreground">
                  {allVisibleIncluded ? "Exclude all" : "Include all"}
                </button>
              )}
            </div>

            {/* Search input */}
            {students.length > 0 && (
              <div className="px-2 py-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    className="h-8 pl-8 text-xs"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Card body */}
            {!selectedClassId || !selectedTermId || !selectedExamType ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
                <Users className="h-8 w-8 opacity-30" />
                <p className="text-xs">Select class, term and exam type to review recipients</p>
              </div>
            ) : loadingStudents ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-xs text-muted-foreground animate-pulse">Loading...</div>
              </div>
            ) : students.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8 opacity-30" />
                <p className="text-xs">
                  No completed results found. Mark assessments as Completed first.
                </p>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {visibleStudents.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        No students match your search
                      </p>
                    ) : (
                      visibleStudents.map((s) => {
                        const excluded = excludedIds.has(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleExclude(s.id)}
                            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors select-none ${
                              excluded
                                ? "opacity-50 bg-muted/20"
                                : "hover:bg-muted/50"
                            }`}>
                            <Checkbox
                              checked={!excluded}
                              onCheckedChange={() => toggleExclude(s.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">
                                {s.firstName} {s.lastName}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{s.studentNumber}</p>
                            </div>
                            {!s.hasPhone && (
                              <PhoneOff className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
                {/* Footer count */}
                <div className="px-3 py-2 border-t bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
                  <span>{includedStudents.length} of {students.length} will receive</span>
                  {recipientSearch.trim() && (
                    <span className="text-muted-foreground/70">{visibleStudents.length} shown</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
