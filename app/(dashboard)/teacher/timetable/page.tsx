"use client";

import { useState, useEffect } from "react";
import { cn, formatCompactClassLabel } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, BookOpen, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { StatsCard } from "@/components/hod/assessments/stats-card";
import { downloadTeacherTimetablePdf } from "@/lib/pdf/teacher-timetable-pdf";

interface TimetableSlot {
  id: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: {
    id: string;
    name: string;
  };
  class: {
    id: string;
    name: string;
    grade: {
      name: string;
    };
  };
  roomNumber?: string | null;
}

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
};

const DAY_CHIPS = [
  { key: "MONDAY",    label: "Mon" },
  { key: "TUESDAY",   label: "Tue" },
  { key: "WEDNESDAY", label: "Wed" },
  { key: "THURSDAY",  label: "Thu" },
  { key: "FRIDAY",    label: "Fri" },
];

/** Returns the current weekday key; defaults to MONDAY on weekends. */
function getCurrentWeekday(): string {
  const map: Record<number, string> = {
    1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY", 4: "THURSDAY", 5: "FRIDAY",
  };
  return map[new Date().getDay()] ?? "MONDAY";
}

export default function TeacherTimetablePage() {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [teacherName, setTeacherName] = useState<string>("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>(getCurrentWeekday);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    setFetchError(null);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/teacher/timetable", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json().catch(() => null);

      // Treat 404 / "no active academic year" as an expected empty state, not an error
      if (response.status === 404 || result?.error?.toLowerCase().includes("academic year")) {
        setSlots([]);
        return;
      }

      if (!response.ok || !result?.success) {
        setFetchError("Unable to load your timetable. Please try again later.");
        return;
      }

      const data = result.data;
      setSlots(data.slots || []);

      if (data.teacher) {
        setTeacherName(`${data.teacher.firstName} ${data.teacher.lastName}`);
      }
    } catch {
      setFetchError("Unable to load your timetable. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      let schoolName: string | undefined;
      let schoolLogoBase64: string | undefined;
      try {
        const token = localStorage.getItem("auth_token");
        const res = await fetch("/api/admin/settings/school-info", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          schoolName = data.settings?.name ?? undefined;
          schoolLogoBase64 = data.logoBase64 ?? undefined;
        }
      } catch {
        // school info is optional; proceed without it
      }
      await downloadTeacherTimetablePdf({ teacherName, slots, schoolName, schoolLogoBase64 });
    } catch {
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const groupSlotsByDay = () => {
    const grouped: Record<string, TimetableSlot[]> = {};
    DAYS_OF_WEEK.forEach((day) => {
      grouped[day] = slots
        .filter((slot) => slot.dayOfWeek === day)
        .sort((a, b) => a.periodNumber - b.periodNumber);
    });
    return grouped;
  };

  const getMaxPeriods = () => {
    return slots.length > 0
      ? Math.max(...slots.map((slot) => slot.periodNumber))
      : 8;
  };

  const getSlotForDayAndPeriod = (day: string, period: number) => {
    const groupedSlots = groupSlotsByDay();
    return groupedSlots[day]?.find((slot) => slot.periodNumber === period);
  };

  const getWeeklyStats = () => {
    const uniqueClasses = new Set(slots.map((slot) => slot.class.id));
    const uniqueSubjects = new Set(slots.map((slot) => slot.subject.id));
    return {
      totalSlots: slots.length,
      uniqueClasses: uniqueClasses.size,
      uniqueSubjects: uniqueSubjects.size,
    };
  };

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        {/* Desktop header skeleton */}
        <div className="hidden lg:block">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-56 mt-1" />
        </div>
        {/* Stats */}
        <div className="px-4 lg:px-0 grid grid-cols-3 gap-2 lg:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 lg:h-20 rounded-lg" />
          ))}
        </div>
        {/* Desktop table skeleton */}
        <div className="hidden lg:block border rounded-lg p-6 space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-64" />
          <div className="space-y-0">
            <div className="flex gap-2 pb-2 border-b">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-2 py-3 border-b last:border-0">
                <Skeleton className="h-12 w-16" />
                <Skeleton className="h-12 w-20" />
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-12 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Mobile skeleton */}
        <div className="lg:hidden space-y-3">
          {/* Day chips */}
          <div className="flex gap-2 px-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-12 rounded-full" />
            ))}
          </div>
          {/* Day label row */}
          <div className="flex items-center justify-between px-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          {/* List rows */}
          <div className="mx-4 rounded-xl border overflow-hidden">
            <Skeleton className="h-9 w-full rounded-none" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b last:border-0">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="space-y-4">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <h1 className="text-3xl font-bold">My Timetable</h1>
          <p className="text-muted-foreground">Your personal teaching schedule</p>
        </div>
        <Card className="mx-4 lg:mx-0">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Calendar className="h-12 w-12 text-muted-foreground" />
            <p className="font-medium">{fetchError}</p>
            <button
              onClick={() => { setLoading(true); fetchTimetable(); }}
              className="text-sm text-primary underline underline-offset-4"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const groupedSlots = groupSlotsByDay();
  const maxPeriods = getMaxPeriods();
  const stats = getWeeklyStats();
  const selectedDaySlots = groupedSlots[selectedDay] ?? [];

  return (
    <div className="space-y-4 lg:space-y-6">

      {/* ── Desktop header (hidden on mobile — layout top bar handles it) ──── */}
      <div className="hidden lg:flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Timetable</h1>
          <p className="text-muted-foreground">
            Your personal teaching schedule
            {teacherName && ` - ${teacherName}`}
          </p>
        </div>
        <Button
          onClick={handleDownloadPdf}
          disabled={slots.length === 0 || downloading}
          variant="outline"
          size="sm"
          className="shrink-0"
        >
          <Download className="mr-2 h-4 w-4" />
          {downloading ? "Generating..." : "Download PDF"}
        </Button>
      </div>

      {/* ── Weekly stats (always visible, 3-col grid) ─────────────────────── */}
      <div className="px-4 lg:px-0 grid grid-cols-3 gap-2 lg:gap-4 mt-5">
        <StatsCard
          title="Total Sessions"
          value={stats.totalSlots}
          icon={Calendar}
          variant="info"
        />
        <StatsCard
          title="Classes"
          value={stats.uniqueClasses}
          icon={BookOpen}
          variant="success"
        />
        <StatsCard
          title="Subjects"
          value={stats.uniqueSubjects}
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* ── Desktop: weekly grid table ────────────────────────────────────── */}
      <div className="hidden lg:block">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>
              Your complete teaching schedule for the week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {slots.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  No timetable available yet. Please contact your administrator.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Period</TableHead>
                      <TableHead className="w-24">Time</TableHead>
                      {DAYS_OF_WEEK.map((day) => (
                        <TableHead key={day} className="min-w-[180px]">
                          {DAY_LABELS[day]}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: maxPeriods }, (_, i) => i + 1).map(
                      (period) => {
                        const sampleSlot =
                          getSlotForDayAndPeriod(DAYS_OF_WEEK[0], period) ||
                          getSlotForDayAndPeriod(DAYS_OF_WEEK[1], period) ||
                          getSlotForDayAndPeriod(DAYS_OF_WEEK[2], period);

                        return (
                          <TableRow key={period}>
                            <TableCell className="font-medium text-center">
                              {period}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {sampleSlot?.startTime || "-"}
                              <br />
                              {sampleSlot?.endTime || "-"}
                            </TableCell>
                            {DAYS_OF_WEEK.map((day) => {
                              const slot = getSlotForDayAndPeriod(day, period);
                              if (!slot) {
                                return (
                                  <TableCell key={day} className="bg-muted/30">
                                    <div className="text-xs text-muted-foreground text-center">
                                      Free Period
                                    </div>
                                  </TableCell>
                                );
                              }
                              return (
                                <TableCell key={day} className="bg-primary/5">
                                  <div className="space-y-1.5">
                                    <div className="font-semibold text-sm">
                                      {slot.subject.name}
                                    </div>
                                    <div className="flex gap-1 flex-wrap">
                                      <Badge variant="default" className="text-xs">
                                        {formatCompactClassLabel(slot.class.grade.name, slot.class.name)}
                                      </Badge>
                                      {slot.roomNumber && (
                                        <Badge variant="outline" className="text-xs">
                                          {slot.roomNumber}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      }
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Mobile: single-day view with day picker ───────────────────────── */}
      <div className="lg:hidden space-y-3 pb-2">

        {/* Day picker chips */}
        <div className="flex gap-2 px-4 overflow-x-auto pb-0.5 my-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {DAY_CHIPS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedDay(key)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
                selectedDay === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Day label + Download button row */}
        <div className="flex items-center justify-between px-4">
          <p className="text-sm text-muted-foreground font-medium">
            {DAY_LABELS[selectedDay]}
            {" · "}
            {selectedDaySlots.length === 0
              ? "No sessions"
              : `${selectedDaySlots.length} session${selectedDaySlots.length !== 1 ? "s" : ""}`}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={slots.length === 0 || downloading}
            className="h-8 w-8 p-0 shrink-0"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Day period list */}
        {slots.length === 0 ? (
          <div className="mx-4 mt-2 rounded-xl border py-12 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No timetable available yet.
            </p>
          </div>
        ) : (
          <div className="mx-4 mt-5 rounded-xl border overflow-hidden">
            {/* Column header */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/70 border-b">
              <span className="w-10 text-xs font-medium text-muted-foreground">#</span>
              <span className="w-14 text-xs font-medium text-muted-foreground">Time</span>
              <span className="flex-1 text-xs font-medium text-muted-foreground">Subject</span>
              <span className="text-xs font-medium text-muted-foreground">Class</span>
            </div>

            {selectedDaySlots.length > 0 ? (
              selectedDaySlots.map((slot, i) => (
                <div
                  key={slot.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 border-b last:border-0",
                    i % 2 !== 0 && "bg-muted/20"
                  )}
                >
                  {/* Period # */}
                  <span className="w-10 text-xs font-semibold text-muted-foreground shrink-0">
                    P{slot.periodNumber}
                  </span>
                  {/* Time */}
                  <span className="w-14 text-xs text-muted-foreground shrink-0">
                    {slot.startTime}
                  </span>
                  {/* Subject */}
                  <span className="flex-1 text-sm font-semibold leading-snug">
                    {slot.subject.name}
                  </span>
                  {/* Class + optional room */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="default" className="text-xs px-1.5 py-0.5">
                      {formatCompactClassLabel(slot.class.grade.name, slot.class.name)}
                    </Badge>
                    {slot.roomNumber && (
                      <span className="text-xs text-muted-foreground">
                        Rm {slot.roomNumber}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No classes on {DAY_LABELS[selectedDay]}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
