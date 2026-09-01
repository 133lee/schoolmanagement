"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ClipboardList, Download, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn, formatCompactClassLabel } from "@/lib/utils";
import {
  downloadSessionRegisterPdf,
  type SessionRegisterPdfData,
} from "@/lib/pdf/session-register-pdf";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Minimal timetable slot info needed to populate the selectors */
interface SlotInfo {
  class:   { id: string; name: string; grade: { name: string } };
  subject: { id: string; name: string };
}

interface StudentRow {
  id:     string;
  name:   string;
  gender: "M" | "F";
}

/** One session = one day the teacher had contact with this class (from the API) */
interface RawSession {
  isoDate: string;                      // "2026-05-05"
  records: Record<string, string>;      // studentId → "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
}

/** One session enriched with display info, ready for rendering */
interface Session {
  key:    string;    // isoDate
  date:   number;    // day-of-month
  suffix: string;    // "th" | "st" | "nd" | "rd"
  month:  string;    // "May"
  records: Record<string, string>;
}

interface WeekGroup {
  label:    string;
  sessions: Session[];
}

interface RegisterData {
  termStartDate: string;
  termLabel:     string;
  students:      StudentRow[];
  sessions:      RawSession[];
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface SessionRegisterSheetProps {
  open:           boolean;
  onOpenChange:   (open: boolean) => void;
  /** All timetable slots for this teacher — used to build the class/subject selectors */
  slots:          SlotInfo[];
  /** Active term ID */
  termId:         string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function ordinalSuffix(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  switch (v % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

/**
 * Group a flat list of sessions (ordered by date asc) into week buckets
 * based on the term start date.  Week 1 = days 0–6 after term start, etc.
 */
function groupByWeek(sessions: RawSession[], termStartDate: string): WeekGroup[] {
  const termStart = new Date(termStartDate + "T00:00:00").getTime();
  const MS_PER_DAY  = 86_400_000;
  const MS_PER_WEEK = MS_PER_DAY * 7;

  const weekMap = new Map<number, WeekGroup>();

  for (const s of sessions) {
    const sessionMs = new Date(s.isoDate + "T00:00:00").getTime();
    const diffDays  = Math.floor((sessionMs - termStart) / MS_PER_DAY);
    const weekNum   = Math.max(1, Math.floor(diffDays / 7) + 1);

    if (!weekMap.has(weekNum)) {
      weekMap.set(weekNum, { label: `Week ${weekNum}`, sessions: [] });
    }

    const d   = new Date(s.isoDate + "T00:00:00").getDate();
    const mon = new Date(s.isoDate + "T00:00:00").toLocaleString("en", { month: "short" });

    weekMap.get(weekNum)!.sessions.push({
      key:    s.isoDate,
      date:   d,
      suffix: ordinalSuffix(d),
      month:  mon,
      records: s.records,
    });
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, w]) => w);
}

function studentSummary(student: StudentRow, allKeys: string[], weeks: WeekGroup[]) {
  let present = 0, absent = 0, late = 0, excused = 0, recorded = 0;
  for (const week of weeks) {
    for (const session of week.sessions) {
      const raw = session.records[student.id];
      if (!raw) continue;
      recorded++;
      if (raw === "PRESENT")  present++;
      else if (raw === "ABSENT")  absent++;
      else if (raw === "LATE")    late++;
      else if (raw === "EXCUSED") excused++;
    }
  }
  const pct = recorded > 0 ? Math.round((present / recorded) * 100) : null;
  return { present, absent, late, excused, recorded, pct };
}

// ── Status display ─────────────────────────────────────────────────────────────

const STATUS_SHORT: Record<string, string> = {
  PRESENT: "P",
  ABSENT:  "A",
  LATE:    "L",
  EXCUSED: "EXC",
};

const STATUS_CELL_CLASS: Record<string, string> = {
  PRESENT: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  ABSENT:  "bg-red-50   text-red-700   dark:bg-red-950/40   dark:text-red-400",
  LATE:    "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  EXCUSED: "bg-blue-50  text-blue-700  dark:bg-blue-950/40  dark:text-blue-400",
};

// ── Component ──────────────────────────────────────────────────────────────────

export function SessionRegisterSheet({
  open,
  onOpenChange,
  slots,
  termId,
}: SessionRegisterSheetProps) {

  // ── Selector options derived from timetable slots ──────────────────────────
  const classOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    for (const s of slots) {
      if (!map.has(s.class.id)) {
        map.set(s.class.id, {
          value: s.class.id,
          label: formatCompactClassLabel(s.class.grade.name, s.class.name),
        });
      }
    }
    return Array.from(map.values());
  }, [slots]);

  const [selectedClassId,   setSelectedClassId]   = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // ── Subject options filter to selected class ───────────────────────────────
  const subjectOptions = useMemo(() => {
    if (!selectedClassId) return [];
    const map = new Map<string, { value: string; label: string }>();
    for (const s of slots.filter((sl) => sl.class.id === selectedClassId)) {
      if (!map.has(s.subject.id)) {
        map.set(s.subject.id, { value: s.subject.id, label: s.subject.name });
      }
    }
    return Array.from(map.values());
  }, [slots, selectedClassId]);

  // ── Initialise / reset selectors when sheet opens ─────────────────────────
  useEffect(() => {
    if (!open || classOptions.length === 0) return;
    const firstClass = classOptions[0].value;
    setSelectedClassId(firstClass);
    // subject will be set by the next effect
  }, [open, classOptions]);

  useEffect(() => {
    if (subjectOptions.length > 0) {
      setSelectedSubjectId(subjectOptions[0].value);
    }
  }, [subjectOptions]);

  // When class changes, reset subject to first option for that class
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const firstSubject = slots.find((s) => s.class.id === classId)?.subject.id ?? "";
    setSelectedSubjectId(firstSubject);
  };

  // ── Data fetch ────────────────────────────────────────────────────────────
  const [registerData, setRegisterData] = useState<RegisterData | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [fetchError,   setFetchError]   = useState<string | null>(null);
  const [pdfLoading,   setPdfLoading]   = useState(false);

  useEffect(() => {
    if (!open || !selectedClassId || !selectedSubjectId || !termId) return;

    setLoading(true);
    setFetchError(null);
    setRegisterData(null);

    const token = typeof window !== "undefined"
      ? localStorage.getItem("auth_token")
      : null;

    fetch(
      `/api/teacher/classes/${selectedClassId}/session-register` +
      `?subjectId=${selectedSubjectId}&termId=${termId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((result) => {
        if (result.success) {
          setRegisterData(result.data);
        } else {
          setFetchError(result.error ?? "Failed to load session data");
        }
      })
      .catch(() => setFetchError("Failed to load session data"))
      .finally(() => setLoading(false));
  }, [open, selectedClassId, selectedSubjectId, termId]);

  // ── Derived display data ──────────────────────────────────────────────────
  const weeks = useMemo(() => {
    if (!registerData) return [];
    return groupByWeek(registerData.sessions, registerData.termStartDate);
  }, [registerData]);

  const allSessionKeys = useMemo(
    () => weeks.flatMap((w) => w.sessions.map((s) => s.key)),
    [weeks]
  );

  const footerTotals = useMemo(() => {
    if (!registerData) return { present: 0, absent: 0, late: 0, excused: 0 };
    return registerData.students.reduce(
      (acc, student) => {
        const sm = studentSummary(student, allSessionKeys, weeks);
        acc.present  += sm.present;
        acc.absent   += sm.absent;
        acc.late     += sm.late;
        acc.excused  += sm.excused;
        return acc;
      },
      { present: 0, absent: 0, late: 0, excused: 0 }
    );
  }, [registerData, weeks, allSessionKeys]);

  // ── PDF download ─────────────────────────────────────────────────────────
  const handleDownloadPdf = useCallback(async () => {
    if (!registerData || weeks.length === 0) return;
    setPdfLoading(true);
    try {
      const token = typeof window !== "undefined"
        ? localStorage.getItem("auth_token")
        : null;

      // Fetch school branding (non-fatal)
      let schoolName:       string | undefined;
      let schoolLogoBase64: string | undefined;
      try {
        const res = await fetch("/api/admin/settings/school-info", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          const info = json.data || json;
          schoolName       = info.settings?.name  || undefined;
          schoolLogoBase64 = info.logoBase64       || undefined;
        }
      } catch { /* non-fatal — proceed without branding */ }

      // Resolve display labels from selector options
      const className   = classOptions.find((c) => c.value === selectedClassId)?.label   ?? selectedClassId;
      const subjectName = subjectOptions.find((s) => s.value === selectedSubjectId)?.label ?? selectedSubjectId;

      const pdfData: SessionRegisterPdfData = {
        termLabel:   registerData.termLabel,
        className,
        subjectName,
        students:    registerData.students,
        // weeks already has the exact shape SessionRegisterPdfData expects
        weeks,
      };

      await downloadSessionRegisterPdf(pdfData, { schoolName, schoolLogoBase64 });
    } finally {
      setPdfLoading(false);
    }
  }, [registerData, weeks, classOptions, subjectOptions, selectedClassId, selectedSubjectId]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col w-full sm:max-w-4xl overflow-hidden"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <SheetHeader className="shrink-0 border-b bg-background px-4 py-4 sm:px-6 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base leading-snug">Session Record</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {registerData?.termLabel ?? (termId ? "Loading…" : "No active term")}
                {" — every lesson contact, by date"}
              </p>
            </div>

            {/* Download PDF button */}
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-8 gap-1.5 text-xs"
              disabled={pdfLoading || loading || weeks.length === 0}
              onClick={handleDownloadPdf}
              title="Download PDF"
            >
              {pdfLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {pdfLoading ? "Generating…" : "PDF"}
              </span>
            </Button>
          </div>

          {/* Class + subject selectors */}
          <div className="flex gap-2">
            <Select value={selectedClassId} onValueChange={handleClassChange} disabled={loading}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={loading}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 flex-wrap">
            {(
              [
                { key: "P",   label: "Present", cls: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
                { key: "A",   label: "Absent",  cls: "bg-red-50   text-red-700   dark:bg-red-950/40   dark:text-red-400"   },
                { key: "L",   label: "Late",    cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
                { key: "EXC", label: "Excused", cls: "bg-blue-50  text-blue-700  dark:bg-blue-950/40  dark:text-blue-400"  },
              ] as const
            ).map((item) => (
              <span
                key={item.key}
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                  item.cls
                )}
              >
                <span className="font-bold">{item.key}</span>
                <span className="opacity-70">— {item.label}</span>
              </span>
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">
              · = not yet recorded
            </span>
          </div>
        </SheetHeader>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : fetchError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-sm text-destructive font-medium">Failed to load</p>
            <p className="text-xs text-muted-foreground">{fetchError}</p>
          </div>
        ) : !registerData || weeks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground px-6 text-center">
            <ClipboardList className="h-8 w-8 opacity-20" />
            <p className="text-sm font-medium">No sessions recorded yet</p>
            <p className="text-xs opacity-60">
              Sessions will appear here once you start marking attendance for this class and subject.
            </p>
          </div>
        ) : (
          <>
            {/* ── Table (horizontal + vertical scroll) ──────────────────── */}
            <div className="flex-1 overflow-auto">
              <table
                className="border-collapse text-xs"
                style={{ minWidth: "max-content", width: "100%" }}
              >
                <thead className="sticky top-0 z-30">
                  {/* Row 1 — group headers */}
                  <tr className="bg-muted/70 border-b">
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-40 bg-muted/70 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-4 py-2 border-r min-w-[11rem] w-44 whitespace-nowrap"
                    >
                      Student
                    </th>
                    <th
                      rowSpan={2}
                      className="sticky left-44 z-40 bg-muted/70 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-2 py-2 border-r w-8"
                    >
                      G
                    </th>
                    {weeks.map((week, wi) => (
                      <th
                        key={week.label}
                        colSpan={week.sessions.length}
                        className={cn(
                          "text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground py-1.5 px-2",
                          wi < weeks.length - 1 ? "border-r" : ""
                        )}
                      >
                        {week.label}
                      </th>
                    ))}
                    <th
                      rowSpan={2}
                      className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2 border-l w-14 whitespace-nowrap"
                    >
                      Att.
                    </th>
                  </tr>

                  {/* Row 2 — session date sub-headers */}
                  <tr className="bg-muted/50 border-b">
                    {weeks.map((week, wi) =>
                      week.sessions.map((session, si) => (
                        <th
                          key={session.key}
                          title={`${session.date} ${session.month}`}
                          className={cn(
                            "text-center py-1.5 px-1 w-10 min-w-[2.5rem]",
                            si === week.sessions.length - 1 && wi < weeks.length - 1
                              ? "border-r"
                              : si < week.sessions.length - 1
                              ? "border-r border-border/30"
                              : ""
                          )}
                        >
                          <span className="block text-[11px] font-bold text-foreground/80 leading-none">
                            {session.date}
                            <sup className="text-[8px] font-normal">{session.suffix}</sup>
                          </span>
                          {si === 0 && (
                            <span className="block text-[9px] text-muted-foreground mt-0.5 leading-none">
                              {session.month}
                            </span>
                          )}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>

                <tbody>
                  {registerData.students.map((student, rowIdx) => {
                    const sm     = studentSummary(student, allSessionKeys, weeks);
                    const isEven = rowIdx % 2 === 0;
                    const rowBg  = isEven ? "bg-background" : "bg-muted/[0.04]";

                    return (
                      <tr
                        key={student.id}
                        className={cn(
                          "border-b last:border-b-0 hover:bg-primary/[0.03] transition-colors",
                          rowBg
                        )}
                      >
                        {/* Sticky name */}
                        <td
                          className={cn(
                            "sticky left-0 z-10 border-r px-4 py-2.5 font-medium text-sm whitespace-nowrap",
                            rowBg
                          )}
                        >
                          {student.name}
                        </td>

                        {/* Sticky gender bubble */}
                        <td
                          className={cn(
                            "sticky left-44 z-10 border-r px-2 py-2.5 text-center",
                            rowBg
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold",
                              student.gender === "M"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                : "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400"
                            )}
                          >
                            {student.gender}
                          </span>
                        </td>

                        {/* Session cells */}
                        {weeks.map((week, wi) =>
                          week.sessions.map((session, si) => {
                            const rawStatus = session.records[student.id];
                            const isLastInWeek = si === week.sessions.length - 1;
                            const isLastWeek   = wi === weeks.length - 1;

                            return (
                              <td
                                key={session.key}
                                className={cn(
                                  "text-center py-2 px-1",
                                  isLastInWeek && !isLastWeek
                                    ? "border-r"
                                    : !isLastInWeek
                                    ? "border-r border-border/20"
                                    : ""
                                )}
                              >
                                {rawStatus ? (
                                  <span
                                    className={cn(
                                      "inline-flex items-center justify-center w-7 h-6 rounded text-[10px] font-bold",
                                      STATUS_CELL_CLASS[rawStatus] ?? ""
                                    )}
                                  >
                                    {STATUS_SHORT[rawStatus] ?? rawStatus}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/30 select-none">·</span>
                                )}
                              </td>
                            );
                          })
                        )}

                        {/* Attendance % summary */}
                        <td className="border-l px-3 py-2.5 text-center">
                          {sm.pct !== null ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={cn(
                                  "text-[11px] font-bold tabular-nums",
                                  sm.pct >= 80
                                    ? "text-green-600 dark:text-green-400"
                                    : sm.pct >= 60
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-red-600 dark:text-red-400"
                                )}
                              >
                                {sm.pct}%
                              </span>
                              <span className="text-[9px] text-muted-foreground tabular-nums">
                                {sm.present}/{sm.recorded}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="shrink-0 border-t bg-muted/30 px-4 py-3 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {registerData.students.length}
                  </span>{" "}
                  students ·{" "}
                  <span className="font-semibold text-foreground">
                    {allSessionKeys.length}
                  </span>{" "}
                  sessions
                </p>
                <div className="flex items-center gap-3 text-xs font-semibold tabular-nums">
                  <span className="text-green-600 dark:text-green-400">
                    {footerTotals.present} P
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    {footerTotals.absent} A
                  </span>
                  {footerTotals.late > 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {footerTotals.late} L
                    </span>
                  )}
                  {footerTotals.excused > 0 && (
                    <span className="text-blue-600 dark:text-blue-400">
                      {footerTotals.excused} EXC
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
