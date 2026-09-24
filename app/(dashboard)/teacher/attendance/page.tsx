"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  ChevronLeft,
  ClipboardList,
  Clock,
  BookOpen,
  MapPin,
  Users,
  Check,
  X,
  Loader2,
  Search,
  NotebookPen,
  GraduationCap,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCompactClassLabel, getErrorMessage } from "@/lib/utils";
import { SessionRegisterSheet } from "@/components/attendance/session-register-sheet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Types ──────────────────────────────────────────────────────────────────────

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface TimetableSlot {
  id: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: { id: string; name: string };
  class: { id: string; name: string; grade: { name: string } };
  roomNumber?: string | null;
}

interface StudentData {
  id: string;
  name: string;
  gender: "M" | "F";
  age: number;
}

interface ExistingRecord {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string | null;
}

interface LessonLogData {
  id: string;
  topic: string;
  subtopics?: string | null;
}

interface RemedialAbsentee {
  id: string;
  name: string;
  studentNumber: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const JS_DAY_TO_KEY: Record<number, string> = {
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
};

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; idle: string; active: string }
> = {
  PRESENT: {
    label: "P",
    idle: "border-border hover:border-green-400 hover:text-green-600",
    active: "bg-green-500 text-white border-green-500",
  },
  ABSENT: {
    label: "A",
    idle: "border-border hover:border-red-400 hover:text-red-600",
    active: "bg-red-500 text-white border-red-500",
  },
  LATE: {
    label: "L",
    idle: "border-border hover:border-amber-400 hover:text-amber-600",
    active: "bg-amber-500 text-white border-amber-500",
  },
  EXCUSED: {
    label: "EXC",
    idle: "border-border hover:border-blue-400 hover:text-blue-600",
    active: "bg-blue-500 text-white border-blue-500",
  },
};

const STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function toDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  // ── Date ───────────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // ── Timetable ──────────────────────────────────────────────────────────────
  const [allSlots, setAllSlots] = useState<TimetableSlot[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(true);

  // ── Selected slot ──────────────────────────────────────────────────────────
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);

  // ── Register state ─────────────────────────────────────────────────────────
  const [students, setStudents] = useState<StudentData[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [markedCounts, setMarkedCounts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // ── Search ─────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── Term ───────────────────────────────────────────────────────────────────
  const [activeTermId, setActiveTermId] = useState<string | null>(null);

  // ── Mobile two-panel navigation ────────────────────────────────────────────
  const [mobileView, setMobileView] = useState<"periods" | "register">("periods");

  // ── Session register sheet ─────────────────────────────────────────────────
  const [registerOpen, setRegisterOpen] = useState(false);

  // ── Lesson log + remedial list ──────────────────────────────────────────────
  const [lessonLog, setLessonLog] = useState<LessonLogData | null>(null);
  const [remedialAbsentees, setRemedialAbsentees] = useState<RemedialAbsentee[]>([]);
  const [remedialLoading, setRemedialLoading] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logTopic, setLogTopic] = useState("");
  const [logSubtopics, setLogSubtopics] = useState("");
  const [loggingLesson, setLoggingLesson] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // ── Fetch timetable + active term on mount ─────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const h = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/teacher/timetable", { headers: h }).then((r) => r.json()),
      fetch("/api/terms/active", { headers: h }).then((r) => r.json()),
    ])
      .then(([ttRes, termRes]) => {
        if (ttRes.success) setAllSlots(ttRes.data?.slots ?? []);
        if (termRes.success && termRes.data) setActiveTermId(termRes.data.id);
      })
      .catch(() => toast.error("Failed to load timetable"))
      .finally(() => setTimetableLoading(false));
  }, []);

  // ── Slots for the selected date's day of week ──────────────────────────────
  const dayKey = useMemo(
    () => JS_DAY_TO_KEY[selectedDate.getDay()] ?? null,
    [selectedDate]
  );

  const daySlots = useMemo(
    () =>
      dayKey
        ? allSlots
            .filter((s) => s.dayOfWeek === dayKey)
            .sort((a, b) => a.periodNumber - b.periodNumber)
        : [],
    [allSlots, dayKey]
  );

  // ── Double-period detection ────────────────────────────────────────────────
  // Maps each slot ID to its double partner (consecutive period, same class + subject).
  // Both directions are stored so either half knows about the other.
  const doublePartnerMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    for (const slot of daySlots) {
      const partner = daySlots.find(
        (s) =>
          s.periodNumber === slot.periodNumber + 1 &&
          s.class.id === slot.class.id &&
          s.subject.id === slot.subject.id
      );
      if (partner) {
        map.set(slot.id, partner);    // first half → second half
        map.set(partner.id, slot);    // second half → first half
      }
    }
    return map;
  }, [daySlots]);

  // ── Load students + existing records when slot or date changes ─────────────
  useEffect(() => {
    if (!selectedSlot) {
      setStudents([]);
      setStatuses({});
      setRemarks({});
      setSearchQuery("");
      return;
    }
    setSearchQuery("");

    setStudentsLoading(true);
    const token = localStorage.getItem("auth_token");
    const h = { Authorization: `Bearer ${token}` };
    const dateStr = toDateStr(selectedDate);

    Promise.all([
      fetch(`/api/teacher/classes/${selectedSlot.class.id}/students`, {
        headers: h,
      }).then((r) => r.json()),
      fetch(
        `/api/attendance/period?timetableSlotId=${selectedSlot.id}&date=${dateStr}`,
        { headers: h }
      ).then((r) => r.json()),
    ])
      .then(([studentsRes, recordsRes]) => {
        const list: StudentData[] = studentsRes.success
          ? (studentsRes.data?.students ?? [])
          : [];
        setStudents(list);

        // Build maps from existing records
        const existingStatuses: Record<string, AttendanceStatus> = {};
        const existingRemarks: Record<string, string> = {};
        if (recordsRes.success && Array.isArray(recordsRes.data)) {
          for (const r of recordsRes.data as ExistingRecord[]) {
            existingStatuses[r.studentId] = r.status;
            if (r.remarks) existingRemarks[r.studentId] = r.remarks;
          }
        }

        // Default unrecorded students to PRESENT
        const initialStatuses: Record<string, AttendanceStatus> = {};
        for (const s of list) {
          initialStatuses[s.id] = existingStatuses[s.id] ?? "PRESENT";
        }
        setStatuses(initialStatuses);
        setRemarks(existingRemarks);

        const alreadyMarked = Object.keys(existingStatuses).length;
        if (alreadyMarked > 0) {
          setMarkedCounts((prev) => ({
            ...prev,
            [selectedSlot.id]: alreadyMarked,
          }));
        }
      })
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setStudentsLoading(false));
  }, [selectedSlot, selectedDate]);

  // ── Lesson log + remedial view for the selected slot/date ──────────────────
  const refreshRemedial = useCallback(async () => {
    if (!selectedSlot) {
      setLessonLog(null);
      setRemedialAbsentees([]);
      return;
    }
    setRemedialLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const dateStr = toDateStr(selectedDate);
      const res = await fetch(
        `/api/teacher/attendance/remedial?timetableSlotId=${selectedSlot.id}&date=${dateStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json.success) {
        setLessonLog(json.data.log ?? null);
        setRemedialAbsentees(json.data.absentees ?? []);
      }
    } catch {
      // Non-critical — the remedial card just won't show; don't block the page.
    } finally {
      setRemedialLoading(false);
    }
  }, [selectedSlot, selectedDate]);

  useEffect(() => {
    refreshRemedial();
  }, [refreshRemedial]);

  // ── Date change → deselect slot + reset mobile to period list ─────────────
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value + "T00:00:00"));
    setSelectedSlot(null);
    setMarkedCounts({});
    setMobileView("periods");
  };

  // ── Slot select — shared handler (also switches mobile view) ──────────────
  const handleSlotSelect = useCallback((slot: TimetableSlot) => {
    setSelectedSlot(slot);
    setMobileView("register");
  }, []);

  // ── Derived counts ─────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    for (const s of Object.values(statuses)) c[s]++;
    return c;
  }, [statuses]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, searchQuery]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  /** POST a single attendance payload; returns the API result. */
  const postAttendance = useCallback(
    async (
      slot: TimetableSlot,
      records: { studentId: string; status: AttendanceStatus; remarks?: string }[],
      token: string,
      dateUtc: Date
    ) => {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classId: slot.class.id,
          termId: activeTermId,
          date: dateUtc.toISOString(),
          timetableSlotId: slot.id,
          records,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to save");
      return result;
    },
    [activeTermId]
  );

  const handleSubmit = async () => {
    if (!selectedSlot) return;
    if (!activeTermId) {
      toast.error("No active term found. Contact your administrator.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token") ?? "";
      const dateUtc = new Date(
        Date.UTC(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        )
      );

      const records = students.map((s) => ({
        studentId: s.id,
        status: statuses[s.id] ?? ("PRESENT" as AttendanceStatus),
        remarks: remarks[s.id] || undefined,
      }));

      // ── Save the selected period ───────────────────────────────────────────
      const result = await postAttendance(selectedSlot, records, token, dateUtc);
      const saved = students.length - (result.data?.failed?.length ?? 0);
      toast.success(`Saved — ${saved} of ${students.length} students marked`);

      setMarkedCounts((prev) => ({
        ...prev,
        [selectedSlot.id]: students.length,
      }));

      // New ABSENT records may now exist — refresh the remedial list.
      refreshRemedial();

      // ── Double-period auto-fill ────────────────────────────────────────────
      // Only fires when saving the FIRST half of a double and the second half
      // hasn't been independently marked yet — so teacher overrides are safe.
      const partner = doublePartnerMap.get(selectedSlot.id);
      const isFirstHalf =
        partner && partner.periodNumber === selectedSlot.periodNumber + 1;
      const partnerUnmarked =
        partner && (markedCounts[partner.id] === undefined || markedCounts[partner.id] === 0);

      if (isFirstHalf && partnerUnmarked) {
        try {
          await postAttendance(partner, records, token, dateUtc);
          setMarkedCounts((prev) => ({
            ...prev,
            [partner.id]: students.length,
          }));
          toast.info(
            `Double period — Period ${partner.periodNumber} pre-filled. Tap to review or adjust.`
          );
        } catch {
          // Non-fatal: the main save already succeeded
          toast.warning(`Period ${partner.periodNumber} pre-fill failed — mark it manually.`);
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save attendance"));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Log this lesson ─────────────────────────────────────────────────────────
  const openLogDialog = () => {
    setLogTopic(lessonLog?.topic ?? "");
    setLogSubtopics(lessonLog?.subtopics ?? "");
    setLogDialogOpen(true);
  };

  const handleLogLesson = async () => {
    if (!selectedSlot) return;
    if (!logTopic.trim()) {
      toast.error("Enter what topic was covered");
      return;
    }

    setLoggingLesson(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/lesson-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timetableSlotId: selectedSlot.id,
          date: toDateStr(selectedDate),
          topic: logTopic.trim(),
          subtopics: logSubtopics.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to log lesson");

      setLessonLog(json.data.log);
      toast.success("Lesson logged");
      setLogDialogOpen(false);
      refreshRemedial();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to log lesson"));
    } finally {
      setLoggingLesson(false);
    }
  };

  // ── Remedial list PDF ────────────────────────────────────────────────────────
  const handleDownloadRemedialPdf = async () => {
    if (!selectedSlot) return;
    setDownloadingPdf(true);
    try {
      const token = localStorage.getItem("auth_token");
      const dateStr = toDateStr(selectedDate);
      const res = await fetch(
        `/api/teacher/attendance/remedial-pdf?timetableSlotId=${selectedSlot.id}&date=${dateStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate remedial list");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = res.headers.get("Content-Disposition");
      a.download = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `remedial_list_${toDateStr(selectedDate)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to download remedial list"));
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // Shared period-card renderer (used in both mobile + desktop period lists)
  const renderPeriodList = (onSelect: (slot: TimetableSlot) => void) => (
    <>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {dayKey
          ? `${dayKey.charAt(0) + dayKey.slice(1).toLowerCase()}'s Periods`
          : "Weekend"}
      </p>

      {timetableLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !dayKey ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <span className="flex items-center justify-center h-8 w-8 rounded-full border-2 border-border text-sm font-bold">
              W
            </span>
            <p className="text-sm">No classes on weekends</p>
          </CardContent>
        </Card>
      ) : daySlots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <Clock className="h-8 w-8 opacity-25" />
            <p className="text-sm">No periods scheduled</p>
          </CardContent>
        </Card>
      ) : (
        daySlots.map((slot) => {
          const isSelected = selectedSlot?.id === slot.id;
          const marked = markedCounts[slot.id];
          const partner = doublePartnerMap.get(slot.id);
          const isFirstHalf = partner && partner.periodNumber === slot.periodNumber + 1;
          const isSecondHalf = partner && partner.periodNumber === slot.periodNumber - 1;

          return (
            <button
              key={slot.id}
              onClick={() => onSelect(slot)}
              className={cn(
                "w-full text-left rounded-xl border p-4 transition-all space-y-2",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                  : "border-border bg-card hover:border-foreground/20"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Period label + double indicator */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    Period {slot.periodNumber}
                  </span>
                  {isFirstHalf && (
                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 leading-none">
                      ×2
                    </span>
                  )}
                  {isSecondHalf && (
                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 leading-none">
                      ↑ P{partner.periodNumber}
                    </span>
                  )}
                </div>
                {marked !== undefined && (
                  <Badge
                    variant={marked > 0 ? "default" : "outline"}
                    className="text-[10px] h-5 px-1.5"
                  >
                    {marked > 0 ? `${marked} marked` : "Not marked"}
                  </Badge>
                )}
              </div>

              <p className="font-semibold text-sm leading-tight">
                {slot.subject.name}
              </p>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  {fmtTime(slot.startTime)}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3 shrink-0" />
                  {formatCompactClassLabel(slot.class.grade.name, slot.class.name)}
                </span>
                {slot.roomNumber && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {slot.roomNumber}
                  </span>
                )}
              </div>
            </button>
          );
        })
      )}
    </>
  );

  // Shared register renderer (used in both mobile + desktop)
  const renderRegister = (cardClassName: string) => {
    if (!selectedSlot) {
      return (
        <Card className="min-h-[420px]">
          <CardContent className="flex flex-col items-center justify-center min-h-[420px] gap-3 text-muted-foreground">
            <Users className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">
              Select a period to open the register
            </p>
            <p className="text-xs opacity-60 text-center max-w-xs">
              Choose one of your lesson periods on the left
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
      <Card className={cn("flex flex-col", cardClassName)}>
        {/* Card header */}
        <CardHeader className="shrink-0 pb-3">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base">
                  {selectedSlot.subject.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedSlot.class.name} ·{" "}
                  {format(selectedDate, "EEE, MMM d yyyy")}
                </p>
              </div>

              {/* Live summary chips */}
              {!studentsLoading && students.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-semibold">
                    <Check className="h-3 w-3" />
                    {counts.PRESENT}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-semibold">
                    <X className="h-3 w-3" />
                    {counts.ABSENT}
                  </span>
                  {counts.LATE > 0 && (
                    <span className="px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                      L {counts.LATE}
                    </span>
                  )}
                  {counts.EXCUSED > 0 && (
                    <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                      EXC {counts.EXCUSED}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Log this lesson */}
            <Button
              variant={lessonLog ? "secondary" : "outline"}
              size="sm"
              className="h-8 text-xs w-fit"
              onClick={openLogDialog}
              disabled={remedialLoading}
            >
              <NotebookPen className="h-3.5 w-3.5 mr-1.5" />
              {lessonLog ? "Lesson logged — edit" : "Log this lesson"}
            </Button>

            {/* Search */}
            {!studentsLoading && students.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search students…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            )}

            {/* Double-period notice — only on the first half */}
            {(() => {
              const partner = doublePartnerMap.get(selectedSlot.id);
              const isFirstHalf = partner && partner.periodNumber === selectedSlot.periodNumber + 1;
              const partnerUnmarked = partner && (markedCounts[partner.id] === undefined || markedCounts[partner.id] === 0);
              if (!isFirstHalf) return null;
              return (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 text-[11px] text-violet-700 dark:text-violet-400">
                  <span className="font-bold shrink-0 mt-0.5">×2</span>
                  <span>
                    Double period — saving will
                    {partnerUnmarked
                      ? <strong> pre-fill Period {partner.periodNumber} </strong>
                      : <> update Period {partner.periodNumber} only if unmarked — it has already been marked independently </>
                    }
                    automatically. You can still open Period {partner.periodNumber} to adjust individual students.
                  </span>
                </div>
              );
            })()}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="flex flex-col flex-1 min-h-0 p-0 overflow-hidden">
          {studentsLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="px-4 py-3 lg:px-6">
                  <div className="grid grid-cols-[2rem_1fr_auto] gap-x-3 items-center lg:gap-x-4">
                    <Skeleton className="h-3 w-4" />
                    <div className="flex items-center gap-2 lg:gap-5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} className="h-8 w-8 rounded-md" />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Users className="h-8 w-8 opacity-20" />
              <p className="text-sm">No students found for this class</p>
            </div>
          ) : (
            <>
              {/* Column headers */}
              <div className="shrink-0 grid grid-cols-[2rem_1fr_auto] gap-x-4 px-4 py-2 border-b bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide lg:px-6">
                <span>#</span>
                <span>Student</span>
                <span>Status</span>
              </div>

              <ScrollArea className="flex-1">
                <div className="divide-y">
                  {filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                      <Search className="h-6 w-6 opacity-20" />
                      <p className="text-sm">No students match your search</p>
                    </div>
                  ) : null}
                  {filteredStudents.map((student, idx) => {
                    const status = statuses[student.id] ?? "PRESENT";
                    const needsRemark =
                      status === "ABSENT" ||
                      status === "LATE" ||
                      status === "EXCUSED";

                    return (
                      <div
                        key={student.id}
                        className="px-4 py-3 space-y-2 lg:px-6"
                      >
                        <div className="grid grid-cols-[2rem_1fr_auto] gap-x-3 items-center lg:gap-x-4">
                          {/* Row number */}
                          <span className="text-xs text-muted-foreground font-medium">
                            {idx + 1}
                          </span>

                          {/* Name + gender */}
                          <div className="flex items-center gap-2 min-w-0 lg:gap-5">
                            <p className="text-sm font-medium truncate">
                              {student.name}
                            </p>
                            <span
                              className={cn(
                                "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0",
                                student.gender === "M"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                                  : "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400"
                              )}
                            >
                              {student.gender}
                            </span>
                          </div>

                          {/* P / A / L / EXC buttons */}
                          <div className="flex gap-1">
                            {STATUSES.map((s) => (
                              <button
                                key={s}
                                onClick={() =>
                                  setStatuses((prev) => ({
                                    ...prev,
                                    [student.id]: s,
                                  }))
                                }
                                className={cn(
                                  "h-8 min-w-[2rem] px-1.5 rounded-md border text-xs font-bold transition-all lg:px-2",
                                  status === s
                                    ? STATUS_CONFIG[s].active
                                    : STATUS_CONFIG[s].idle
                                )}
                              >
                                {STATUS_CONFIG[s].label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Remarks */}
                        {needsRemark && (
                          <div className="pl-8">
                            <Textarea
                              placeholder={`Reason for ${status.toLowerCase()}...`}
                              className="text-xs min-h-[52px] resize-none"
                              value={remarks[student.id] ?? ""}
                              onChange={(e) =>
                                setRemarks((prev) => ({
                                  ...prev,
                                  [student.id]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Footer */}
              <Separator className="mb-3" />
              <div className="shrink-0 px-4 py-0 flex items-center justify-between lg:px-6">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {students.length}
                  </span>{" "}
                  students
                </p>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {submitting ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Remedial list — auto-derived: a topic was logged for this period
          AND at least one student was marked ABSENT for it. Not shown
          otherwise, so it never appears as an empty/confusing card. ──────── */}
      {!remedialLoading && lessonLog && remedialAbsentees.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <CardTitle className="text-sm">
                    Remedial — {remedialAbsentees.length} student{remedialAbsentees.length === 1 ? "" : "s"} to catch up
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Missed: <span className="font-medium text-foreground">{lessonLog.topic}</span>
                    {lessonLog.subtopics ? ` — ${lessonLog.subtopics}` : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs shrink-0"
                onClick={handleDownloadRemedialPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1.5">
              {remedialAbsentees.map((s) => (
                <span
                  key={s.id}
                  className="px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-medium"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
    );
  };

  return (
    <div className="space-y-4 px-4 lg:px-0 lg:space-y-5">

      {/* ── Desktop header ───────────────────────────────────────────────────── */}
      <div className="hidden lg:flex items-start justify-between mt-2">
        <div>
          <h1 className="text-xl font-bold">Period Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Mark attendance for each lesson you teach
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRegisterOpen(true)}
            className="gap-1.5"
          >
            <ClipboardList className="h-4 w-4" />
            Session Record
          </Button>
          <input
            type="date"
            value={toDateStr(selectedDate)}
            onChange={handleDateChange}
            max={toDateStr(new Date())}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* ── Mobile header ────────────────────────────────────────────────────── */}
      <div className="lg:hidden mt-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold leading-tight truncate">
            {mobileView === "register" && selectedSlot
              ? selectedSlot.subject.name
              : "Period Attendance"}
          </h1>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Session record icon button — only shown on the period list panel */}
            {mobileView === "periods" && (
              <button
                onClick={() => setRegisterOpen(true)}
                className="h-8 w-8 rounded-md border border-input bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Open session record"
              >
                <ClipboardList className="h-4 w-4" />
              </button>
            )}
            <input
              type="date"
              value={toDateStr(selectedDate)}
              onChange={handleDateChange}
              max={toDateStr(new Date())}
              className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {mobileView === "register" && selectedSlot
            ? `${selectedSlot.class.name} · Period ${selectedSlot.periodNumber} · ${format(selectedDate, "EEE, MMM d")}`
            : "Tap a period to take the register"}
        </p>
      </div>

      {/* ── Mobile: two-panel navigation ─────────────────────────────────────── */}
      <div className="lg:hidden">
        {mobileView === "periods" ? (
          /* Panel 1 — period list */
          <div className="space-y-3">
            {renderPeriodList(handleSlotSelect)}
          </div>
        ) : (
          /* Panel 2 — register */
          <div className="space-y-3">
            {/* Back button */}
            <button
              onClick={() => setMobileView("periods")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to periods
            </button>

            {/* Register fills most of the screen */}
            {renderRegister("h-[calc(100dvh-11rem)]")}
          </div>
        )}
      </div>

      {/* ── Desktop: side-by-side ─────────────────────────────────────────────── */}
      <div className="hidden lg:grid gap-6 lg:grid-cols-3">
        {/* Period list — left 1/3 */}
        <div className="lg:col-span-1 space-y-3">
          {renderPeriodList(setSelectedSlot)}
        </div>

        {/* Register — right 2/3 */}
        <div className="lg:col-span-2">
          {renderRegister("h-[560px]")}
        </div>
      </div>

      {/* ── Session record sheet ──────────────────────────────────────────────── */}
      <SessionRegisterSheet
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        slots={allSlots}
        termId={activeTermId}
      />

      {/* ── Log this lesson ─────────────────────────────────────────────────────── */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log this lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="log-topic">Topic</Label>
              <Input
                id="log-topic"
                placeholder="e.g. Photosynthesis"
                value={logTopic}
                onChange={(e) => setLogTopic(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-subtopics">Subtopic(s) (optional)</Label>
              <Textarea
                id="log-subtopics"
                placeholder="e.g. Light-dependent reactions, chlorophyll structure"
                value={logSubtopics}
                onChange={(e) => setLogSubtopics(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogLesson} disabled={loggingLesson}>
              {loggingLesson && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
