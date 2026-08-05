"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatClassLabel } from "@/lib/utils";
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
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
        {/* Filter bar skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        {/* Timetable grid skeleton */}
        <Card>
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

  const totalConflicts = [...new Set(
    visibleSlots.filter(s => conflictIds.has(s.id)).map(s => s.id)
  )].length;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
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

          {/* Undo */}
          {editMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={history.length === 0}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Undo
            </Button>
          )}

          {/* Toggle edit mode */}
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(v => !v)}
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

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">View by:</span>
          <Select
            value={filterMode}
            onValueChange={v => {
              setFilterMode(v as FilterMode);
              setSelectedId("");
            }}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="class">Class</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-48 h-8">
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
          <span className="text-sm text-muted-foreground">
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
                    <th className="w-20 px-3 py-2 text-left text-xs font-medium text-muted-foreground border-b">
                      Period
                    </th>
                    <th className="w-24 px-3 py-2 text-left text-xs font-medium text-muted-foreground border-b">
                      Time
                    </th>
                    {DAYS.map(day => (
                      <th
                        key={day}
                        className="min-w-[160px] px-3 py-2 text-left text-xs font-medium text-muted-foreground border-b"
                      >
                        {DAY_SHORT[day]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map(period => {
                    const time = timeFor(period);
                    return (
                      <tr key={period} className="border-b last:border-b-0">
                        <td className="px-3 py-2 text-center font-medium text-muted-foreground text-xs">
                          P{period}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {time}
                        </td>
                        {DAYS.map(day => {
                          const cellKey = `${day}:${period}`;
                          const slot = grid.get(cellKey);
                          const isOver = dragOver === cellKey;
                          const hasConflict = slot ? conflictIds.has(slot.id) : false;

                          return (
                            <td
                              key={day}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
          <p className="font-semibold truncate leading-tight">{slot.subject.name}</p>
          {showTeacher && (
            <p className="truncate opacity-75 leading-tight">
              {slot.teacher.firstName} {slot.teacher.lastName}
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
