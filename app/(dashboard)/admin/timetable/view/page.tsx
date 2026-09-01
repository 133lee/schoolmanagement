"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatClassLabel, formatTeacherLabel, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Calendar,
  Download,
  GripVertical,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Eye,
  Pencil,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

interface Slot {
  id: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: { id: string; name: string; code: string };
  teacher: { id: string; firstName: string; lastName: string };
  class: { id: string; name: string; grade: { name: string } };
}

interface FilterEntry {
  id: string;
  label: string;
}

interface PeriodSlot {
  periodNumber: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

type FilterMode = "class" | "teacher";

const DAYS: string[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
};

// ── Subject colour palette ────────────────────────────────────────────────────
// Stable colour derived from the subject name — no randomness.
const PALETTE = [
  "bg-blue-100 border-blue-300 text-blue-900",
  "bg-green-100 border-green-300 text-green-900",
  "bg-purple-100 border-purple-300 text-purple-900",
  "bg-amber-100 border-amber-300 text-amber-900",
  "bg-rose-100 border-rose-300 text-rose-900",
  "bg-cyan-100 border-cyan-300 text-cyan-900",
  "bg-indigo-100 border-indigo-300 text-indigo-900",
  "bg-orange-100 border-orange-300 text-orange-900",
  "bg-teal-100 border-teal-300 text-teal-900",
  "bg-pink-100 border-pink-300 text-pink-900",
  "bg-lime-100 border-lime-300 text-lime-900",
  "bg-sky-100 border-sky-300 text-sky-900",
];

function subjectColour(subjectId: string): string {
  let hash = 0;
  for (let i = 0; i < subjectId.length; i++) {
    hash = (hash * 31 + subjectId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

// ── Conflict detection ────────────────────────────────────────────────────────

function detectConflicts(slots: Slot[]): Set<string> {
  // Returns IDs of slots involved in any conflict
  const conflictIds = new Set<string>();

  // teacher → day+period → [slotId]
  const teacherMap = new Map<string, string[]>();
  // class → day+period → [slotId]
  const classMap = new Map<string, string[]>();

  for (const s of slots) {
    const key = `${s.dayOfWeek}:${s.periodNumber}`;

    const tk = `${s.teacher.id}:${key}`;
    if (!teacherMap.has(tk)) teacherMap.set(tk, []);
    teacherMap.get(tk)!.push(s.id);

    const ck = `${s.class.id}:${key}`;
    if (!classMap.has(ck)) classMap.set(ck, []);
    classMap.get(ck)!.push(s.id);
  }

  for (const ids of teacherMap.values()) {
    if (ids.length > 1) ids.forEach(id => conflictIds.add(id));
  }
  for (const ids of classMap.values()) {
    if (ids.length > 1) ids.forEach(id => conflictIds.add(id));
  }

  return conflictIds;
}

// ── Would this move create a conflict? ───────────────────────────────────────

function wouldConflict(
  dragged: Slot,
  targetDay: string,
  targetPeriod: number,
  targetSlot: Slot | null,
  allSlots: Slot[]
): boolean {
  const otherSlots = allSlots.filter(
    s => s.id !== dragged.id && s.id !== (targetSlot?.id ?? "")
  );

  // If swapping, targetSlot moves to dragged's original position
  const hypothetical = [
    ...otherSlots,
    { ...dragged, dayOfWeek: targetDay, periodNumber: targetPeriod },
    ...(targetSlot
      ? [{ ...targetSlot, dayOfWeek: dragged.dayOfWeek, periodNumber: dragged.periodNumber }]
      : []),
  ];

  return detectConflicts(hypothetical).size > 0;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TimetableEditorPage() {
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [periodSlots, setPeriodSlots] = useState<PeriodSlot[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("class");
  const [filterEntries, setFilterEntries] = useState<FilterEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // drag state
  const draggedSlotId = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null); // "DAY:period"
  const [dragConflict, setDragConflict] = useState(false);

  // history for undo
  const [history, setHistory] = useState<Slot[][]>([]);

  // Mobile-only: which day's periods are shown in the day-tabbed list view
  const [mobileDay, setMobileDay] = useState<string>("MONDAY");

  // ── Data loading ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/timetable/view", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch timetable");
      const data = await res.json();
      const slots: Slot[] = data.slots ?? [];
      setAllSlots(slots);
      setPeriodSlots(data.periodSlots ?? []);

      // Build filter lists
      if (filterMode === "class") {
        const seen = new Map<string, FilterEntry>();
        for (const s of slots) {
          if (!seen.has(s.class.id)) {
            seen.set(s.class.id, {
              id: s.class.id,
              label: formatClassLabel(s.class.grade.name, s.class.name),
            });
          }
        }
        const entries = [...seen.values()].sort((a, b) =>
          a.label.localeCompare(b.label)
        );
        setFilterEntries(entries);
        if (entries.length > 0 && !selectedId) setSelectedId(entries[0].id);
      } else {
        const seen = new Map<string, FilterEntry>();
        for (const s of slots) {
          if (!seen.has(s.teacher.id)) {
            seen.set(s.teacher.id, {
              id: s.teacher.id,
              label: `${s.teacher.firstName} ${s.teacher.lastName}`,
            });
          }
        }
        const entries = [...seen.values()].sort((a, b) =>
          a.label.localeCompare(b.label)
        );
        setFilterEntries(entries);
        if (entries.length > 0 && !selectedId) setSelectedId(entries[0].id);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load timetable");
    } finally {
      setLoading(false);
    }
  }, [filterMode, selectedId]);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset selection when switching filter mode
  useEffect(() => {
    setSelectedId("");
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode]);

  // ── Derived data ──────────────────────────────────────────────────────────

  // Slots visible in the current view (filtered by class or teacher)
  const visibleSlots = allSlots.filter(s =>
    filterMode === "class"
      ? s.class.id === selectedId
      : s.teacher.id === selectedId
  );

  // All slots are used for conflict detection (cross-class)
  const conflictIds = detectConflicts(allSlots);

  const maxPeriod = visibleSlots.length > 0
    ? Math.max(...visibleSlots.map(s => s.periodNumber))
    : 8;

  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  // Build grid lookup: "DAY:period" → Slot
  const grid = new Map<string, Slot>();
  for (const s of visibleSlots) {
    grid.set(`${s.dayOfWeek}:${s.periodNumber}`, s);
  }

  // Time label for a period (grab from any slot at that period)
  function timeFor(period: number): string {
    const s = visibleSlots.find(v => v.periodNumber === period);
    return s ? `${s.startTime}–${s.endTime}` : "";
  }

  // Grid columns: real teaching periods plus the break, interleaved by
  // periodNumber (the break's fractional periodNumber, e.g. 4.5, naturally
  // sorts it between the periods on either side).
  interface Column { periodNumber: number; isBreak: boolean; time: string }
  const columns: Column[] = [
    ...periods.map(p => ({ periodNumber: p, isBreak: false, time: timeFor(p) })),
    ...periodSlots
      .filter(p => p.isBreak)
      .map(p => ({ periodNumber: p.periodNumber, isBreak: true, time: `${p.startTime}–${p.endTime}` })),
  ].sort((a, b) => a.periodNumber - b.periodNumber);

  // ── Drag handlers ─────────────────────────────────────────────────────────

  function onDragStart(slotId: string) {
    draggedSlotId.current = slotId;
  }

  function onDragOver(e: React.DragEvent, cellKey: string) {
    e.preventDefault();
    if (dragOver === cellKey) return;
    setDragOver(cellKey);

    const dragged = allSlots.find(s => s.id === draggedSlotId.current);
    if (!dragged) return;

    const [day, period] = cellKey.split(":");
    const targetSlot = grid.get(cellKey) ?? null;

    const conflict = wouldConflict(
      dragged,
      day,
      Number(period),
      targetSlot,
      allSlots
    );
    setDragConflict(conflict);
  }

  function onDragLeave() {
    setDragOver(null);
    setDragConflict(false);
  }

  async function onDrop(e: React.DragEvent, cellKey: string) {
    e.preventDefault();
    setDragOver(null);
    setDragConflict(false);

    const dragged = allSlots.find(s => s.id === draggedSlotId.current);
    draggedSlotId.current = null;
    if (!dragged) return;

    const [targetDay, periodStr] = cellKey.split(":");
    const targetPeriod = Number(periodStr);

    // No-op if dropped on same cell
    if (dragged.dayOfWeek === targetDay && dragged.periodNumber === targetPeriod) return;

    const targetSlot = grid.get(cellKey) ?? null;
    if (targetSlot?.id === dragged.id) return;

    // For a move to an empty cell, find the period's times from any slot at that period
    const periodRef = allSlots.find(s => s.periodNumber === targetPeriod);
    const targetStartTime = targetSlot?.startTime ?? periodRef?.startTime ?? dragged.startTime;
    const targetEndTime   = targetSlot?.endTime   ?? periodRef?.endTime   ?? dragged.endTime;

    // Snapshot for undo
    const snapshot = allSlots;
    setHistory(h => [...h.slice(-9), snapshot]);

    // Optimistic update — swap times too so the grid stays consistent
    setAllSlots(prev =>
      prev.map(s => {
        if (s.id === dragged.id)
          return { ...s, dayOfWeek: targetDay, periodNumber: targetPeriod, startTime: targetStartTime, endTime: targetEndTime };
        if (targetSlot && s.id === targetSlot.id)
          return { ...s, dayOfWeek: dragged.dayOfWeek, periodNumber: dragged.periodNumber, startTime: dragged.startTime, endTime: dragged.endTime };
        return s;
      })
    );

    // Persist
    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const body = targetSlot
        ? { slotId: dragged.id, targetSlotId: targetSlot.id }
        : { slotId: dragged.id, targetDay, targetPeriod, targetStartTime, targetEndTime };

      const res = await fetch("/api/admin/timetable/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update slot");
      }

      toast.success(targetSlot ? "Slots swapped" : "Slot moved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save change");
      setAllSlots(snapshot);
      setHistory(h => h.slice(0, -1));
    } finally {
      setSaving(false);
    }
  }

  function undo() {
    if (history.length === 0) return;
    setAllSlots(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
    toast.info("Change undone");
  }

  // ── Export ────────────────────────────────────────────────────────────────

  async function handleExport() {
    if (!selectedId) return;
    setExporting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const param = filterMode === "class" ? "classId" : "teacherId";
      const res = await fetch(
        `/api/admin/timetable/export-pdf?${param}=${selectedId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const label = filterEntries.find(e => e.id === selectedId)?.label ?? "timetable";
      a.href = url;
      a.download = `${label.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF exported");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 px-4 lg:px-0">
        {/* Header skeleton */}
        <div className="flex items-center justify-between flex-wrap gap-3 mt-5 lg:mt-0">
          <div className="hidden lg:block space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24 hidden lg:block" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
        {/* Filter bar skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 lg:w-32 shrink-0" />
          <Skeleton className="h-8 flex-1 lg:flex-none lg:w-48" />
        </div>
        {/* Timetable skeleton — mobile: day pills + period list */}
        <div className="lg:hidden">
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="flex gap-1.5">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                  <Skeleton key={d} className="h-7 w-12 rounded-full shrink-0" />
                ))}
              </div>
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Timetable grid skeleton — desktop */}
        <Card className="hidden lg:block">
          <CardContent className="p-4">
            <div className="space-y-2">
              {/* Header row */}
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 shrink-0" />
                <Skeleton className="h-6 w-20 shrink-0" />
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                  <Skeleton key={d} className="h-6 flex-1" />
                ))}
              </div>
              {/* Period rows */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-14 w-16 shrink-0" />
                  <Skeleton className="h-14 w-20 shrink-0" />
                  {Array.from({ length: 5 }).map((__, j) => (
                    <Skeleton key={j} className="h-14 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Global count — a conflict between two classes neither currently
  // selected is still a real conflict; scoping this to visibleSlots made
  // the badge falsely say "No conflicts" whenever the conflicting classes
  // weren't the ones currently being viewed.
  const totalConflicts = conflictIds.size;

  return (
    <div className="space-y-4 px-4 lg:px-0">
      {/* ── Header — title hidden on mobile (the top bar already shows
          "Timetable"); Edit Mode/Undo are desktop-only since native HTML5
          drag-and-drop doesn't respond to touch at all, so there's nothing
          useful for them to do on a phone. ─────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mt-5 lg:mt-0">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold">Timetable Editor</h1>
          <p className="text-sm text-muted-foreground">
            {editMode
              ? "Drag slots to move or swap them. Changes save automatically."
              : "Switch to edit mode to drag and rearrange slots."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Conflict summary */}
          {totalConflicts > 0 ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {totalConflicts} conflict{totalConflicts !== 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-green-700 border-green-300">
              <CheckCircle2 className="h-3 w-3" />
              No conflicts
            </Badge>
          )}

          {saving && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving…
            </Badge>
          )}

          {/* Undo — desktop only, tied to Edit Mode */}
          {editMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={history.length === 0}
              className="hidden lg:inline-flex"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Undo
            </Button>
          )}

          {/* Toggle edit mode — desktop only */}
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(v => !v)}
            className="hidden lg:inline-flex"
          >
            {editMode ? (
              <>
                <Eye className="h-4 w-4 mr-1" />
                View Mode
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4 mr-1" />
                Edit Mode
              </>
            )}
          </Button>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || !selectedId}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Mobile-only note explaining why there's no Edit Mode toggle here */}
      <p className="lg:hidden text-xs text-muted-foreground -mt-2">
        View only on this screen — switch to a larger screen to drag and rearrange slots.
      </p>

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-sm font-medium text-muted-foreground">View by:</span>
          <Select
            value={filterMode}
            onValueChange={v => {
              setFilterMode(v as FilterMode);
              setSelectedId("");
            }}
          >
            <SelectTrigger className="w-28 lg:w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="class">Class</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="flex-1 min-w-0 lg:flex-none lg:w-48 h-8">
            <SelectValue placeholder={`Select ${filterMode}…`} />
          </SelectTrigger>
          <SelectContent>
            {filterEntries.map(e => (
              <SelectItem key={e.id} value={e.id}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedId && (
          <span className="w-full lg:w-auto text-sm text-muted-foreground">
            {visibleSlots.length} slot{visibleSlots.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Grid ── */}
      {!selectedId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-3 opacity-40" />
            <p>Select a {filterMode} to view its timetable.</p>
          </CardContent>
        </Card>
      ) : visibleSlots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-3 opacity-40" />
            <p>No timetable slots found. Generate a timetable first.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Mobile: day-tabbed vertical list — the grid table itself
              doesn't translate well to a phone (5 dense columns), and Edit
              Mode's drag-and-drop can't work via touch anyway, so mobile
              gets its own simpler, view-only day-by-day layout instead of a
              shrunk version of the desktop table. ───────────────────────── */}
          <div className="lg:hidden">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="truncate">{filterEntries.find(e => e.id === selectedId)?.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-3">
                {/* Day pills */}
                <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setMobileDay(day)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors",
                        mobileDay === day
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {DAY_SHORT[day]}
                    </button>
                  ))}
                </div>

                {/* Period list for the selected day */}
                <div className="space-y-2">
                  {periods.map(period => {
                    const cellKey = `${mobileDay}:${period}`;
                    const slot = grid.get(cellKey);
                    const hasConflict = slot ? conflictIds.has(slot.id) : false;
                    const time = timeFor(period);

                    return (
                      <div key={period} className="flex items-start gap-3 rounded-lg border p-2.5">
                        <div className="shrink-0 w-14 text-center">
                          <p className="text-xs font-semibold text-muted-foreground">P{period}</p>
                          <p className="text-[10px] text-muted-foreground whitespace-nowrap">{time}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          {slot ? (
                            <SlotCard
                              slot={slot}
                              showClass={filterMode === "teacher"}
                              showTeacher={filterMode === "class"}
                              hasConflict={hasConflict}
                              draggable={false}
                              onDragStart={() => {}}
                            />
                          ) : (
                            <div className="h-10 flex items-center text-xs text-muted-foreground">
                              Free period
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Desktop: full grid — periods across the top, days down the left ── */}
          <div className="hidden lg:block">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {filterEntries.find(e => e.id === selectedId)?.label}
                  {editMode && (
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      — drag any slot to move or swap it
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="w-16 px-3 py-2 text-left text-xs font-medium text-muted-foreground border-b">
                          Day
                        </th>
                        {columns.map(col => (
                          <th
                            key={col.periodNumber}
                            className={
                              col.isBreak
                                ? "w-14 px-1 py-2 text-center text-xs font-medium text-muted-foreground border-b bg-muted/40"
                                : "min-w-[140px] px-3 py-2 text-left text-xs font-medium text-muted-foreground border-b"
                            }
                          >
                            {col.isBreak ? "Break" : `P${col.periodNumber}`}
                            <span className="block font-normal normal-case text-[10px] whitespace-nowrap">
                              {col.time}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map(day => (
                        <tr key={day} className="border-b last:border-b-0">
                          <td className="px-3 py-2 text-center font-medium text-muted-foreground text-xs">
                            {DAY_SHORT[day]}
                          </td>
                          {columns.map(col => {
                            if (col.isBreak) {
                              return (
                                <td
                                  key={col.periodNumber}
                                  className="w-14 px-1 py-1.5 bg-muted/40"
                                />
                              );
                            }

                            const period = col.periodNumber;
                            const cellKey = `${day}:${period}`;
                            const slot = grid.get(cellKey);
                            const isOver = dragOver === cellKey;
                            const hasConflict = slot ? conflictIds.has(slot.id) : false;

                            return (
                              <td
                                key={period}
                                className={[
                                  "px-2 py-1.5 align-top transition-colors",
                                  editMode ? "cursor-default" : "",
                                  isOver && !dragConflict
                                    ? "bg-primary/10 ring-2 ring-inset ring-primary"
                                    : "",
                                  isOver && dragConflict
                                    ? "bg-destructive/10 ring-2 ring-inset ring-destructive"
                                    : "",
                                  !isOver && !slot ? "bg-muted/20" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                onDragOver={editMode ? e => onDragOver(e, cellKey) : undefined}
                                onDragLeave={editMode ? onDragLeave : undefined}
                                onDrop={editMode ? e => onDrop(e, cellKey) : undefined}
                              >
                                {slot ? (
                                  <SlotCard
                                    slot={slot}
                                    showClass={filterMode === "teacher"}
                                    showTeacher={filterMode === "class"}
                                    hasConflict={hasConflict}
                                    draggable={editMode}
                                    onDragStart={() => onDragStart(slot.id)}
                                  />
                                ) : (
                                  <div className="h-12 flex items-center justify-center">
                                    {isOver && (
                                      <span className="text-xs text-muted-foreground">
                                        {dragConflict ? "Conflict!" : "Drop here"}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── Legend ── */}
      {visibleSlots.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive/40" />
            Teacher or class conflict
          </div>
          {editMode && (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-primary/20 border border-primary/40" />
                Valid drop target
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-destructive/10 border border-destructive/40" />
                Conflict if dropped here
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Slot card ─────────────────────────────────────────────────────────────────

interface SlotCardProps {
  slot: Slot;
  showClass: boolean;
  showTeacher: boolean;
  hasConflict: boolean;
  draggable: boolean;
  onDragStart: () => void;
}

function SlotCard({
  slot,
  showClass,
  showTeacher,
  hasConflict,
  draggable,
  onDragStart,
}: SlotCardProps) {
  const colour = subjectColour(slot.subject.id);

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      className={[
        "rounded border px-2 py-1.5 text-xs select-none transition-shadow",
        colour,
        draggable
          ? "cursor-grab active:cursor-grabbing hover:shadow-md"
          : "",
        hasConflict ? "ring-2 ring-destructive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start gap-1">
        {draggable && (
          <GripVertical className="h-3 w-3 mt-0.5 opacity-50 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-semibold truncate leading-tight" title={slot.subject.name}>
            {slot.subject.code || slot.subject.name}
          </p>
          {showTeacher && (
            <p className="truncate opacity-75 leading-tight">
              {formatTeacherLabel(slot.teacher)}
            </p>
          )}
          {showClass && (
            <p className="truncate opacity-75 leading-tight">
              {formatClassLabel(slot.class.grade.name, slot.class.name)}
            </p>
          )}
          {hasConflict && (
            <div className="flex items-center gap-0.5 text-destructive mt-0.5">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span className="text-[10px] font-medium">Conflict</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
