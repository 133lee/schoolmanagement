"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  BookOpen,
  Users,
  FileText,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  PlusCircle,
  ClipboardList,
  GraduationCap,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { StatsCard } from "@/components/shared/stats-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatClassLabel } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ClassData {
  id: string;
  name: string;
  totalStudents?: number;
  isClassTeacher: boolean;
  status: string;
}

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

interface ActiveTerm {
  id: string;
  termType: string;
  startDate: string;
  endDate: string;
  academicYear: string;
}

interface Assessment {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED";
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const JS_DAY_TO_KEY: Record<number, string> = {
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
};

const TERM_LABELS: Record<string, string> = {
  FIRST_TERM: "Term 1",
  SECOND_TERM: "Term 2",
  THIRD_TERM: "Term 3",
};

function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function isNow(s: TimetableSlot): boolean {
  const n = nowMinutes();
  return n >= toMinutes(s.startTime) && n < toMinutes(s.endTime);
}

function isPast(s: TimetableSlot): boolean {
  return nowMinutes() >= toMinutes(s.endTime);
}

// ── Stat skeleton ──────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[76px] rounded-lg" />
      ))}
    </div>
  );
}

// ── Period row ─────────────────────────────────────────────────────────────────

function PeriodRow({ slot }: { slot: TimetableSlot }) {
  const now = isNow(slot);
  const past = isPast(slot);

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3 rounded-lg border transition-colors",
        now ? "border-primary bg-primary/5" : "border-border bg-card",
        past && !now && "opacity-50"
      )}
    >
      {/* Time column */}
      <div className="min-w-[56px] shrink-0 text-center">
        <p className="text-xs font-semibold leading-none">
          {fmtTime(slot.startTime)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {fmtTime(slot.endTime)}
        </p>
      </div>

      <Separator orientation="vertical" className="h-8 shrink-0" />

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-semibold text-sm truncate">{slot.subject.name}</p>
          {now && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
              <span className="size-1.5 rounded-full bg-primary-foreground animate-pulse" />
              NOW
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {formatClassLabel(slot.class.grade.name, slot.class.name)}
          </span>
          {slot.roomNumber && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {slot.roomNumber}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Period badge */}
      <Badge variant="outline" className="text-[10px] shrink-0">
        P{slot.periodNumber}
      </Badge>
    </div>
  );
}

// ── Assessment pill ────────────────────────────────────────────────────────────

function AssessmentPill({
  label,
  count,
  colorClass,
  dotClass,
}: {
  label: string;
  count: number;
  colorClass: string;
  dotClass: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2.5 rounded-lg border",
        colorClass
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full shrink-0", dotClass)} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold tabular-nums">{count}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [classTeacherClasses, setClassTeacherClasses] = useState<ClassData[]>(
    []
  );
  const [subjectTeacherClasses, setSubjectTeacherClasses] = useState<
    ClassData[]
  >([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [activeTerm, setActiveTerm] = useState<ActiveTerm | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  // Read user from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {}
    }
  }, []);

  // Fetch all dashboard data in parallel
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoading(false);
      return;
    }

    const h = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/teacher/classes", { headers: h }).then((r) => r.json()),
      fetch("/api/teacher/timetable", { headers: h }).then((r) => r.json()),
      fetch("/api/terms/active", { headers: h }).then((r) => r.json()),
      fetch("/api/assessments?pageSize=200", { headers: h }).then((r) =>
        r.json()
      ),
    ])
      .then(([classesRes, ttRes, termRes, assRes]) => {
        if (classesRes.success) {
          setClassTeacherClasses(classesRes.data?.classTeacherClasses ?? []);
          setSubjectTeacherClasses(classesRes.data?.subjectTeacherClasses ?? []);
        }
        if (ttRes.success) {
          setTimetableSlots(ttRes.data?.slots ?? []);
        }
        if (termRes.success && termRes.data) {
          setActiveTerm(termRes.data);
        }
        if (assRes.success) {
          setAssessments(assRes.data ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const todayKey = useMemo(
    () => JS_DAY_TO_KEY[new Date().getDay()] ?? null,
    []
  );

  const todaySlots = useMemo(
    () =>
      timetableSlots
        .filter((s) => s.dayOfWeek === todayKey)
        .sort((a, b) => a.periodNumber - b.periodNumber),
    [timetableSlots, todayKey]
  );

  const totalClasses =
    classTeacherClasses.length + subjectTeacherClasses.length;

  const totalStudents = classTeacherClasses.reduce(
    (sum, c) => sum + (c.totalStudents ?? 0),
    0
  );

  const assessmentCounts = useMemo(
    () => ({
      draft: assessments.filter((a) => a.status === "DRAFT").length,
      published: assessments.filter((a) => a.status === "PUBLISHED").length,
      completed: assessments.filter((a) => a.status === "COMPLETED").length,
    }),
    [assessments]
  );

  const firstName = user?.profile?.firstName ?? user?.name?.split(" ")[0] ?? "Teacher";

  const termLabel = activeTerm
    ? `${TERM_LABELS[activeTerm.termType] ?? activeTerm.termType} · ${activeTerm.academicYear}`
    : null;

  const todayLabel = format(new Date(), "EEEE, MMMM d, yyyy");

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 px-4 pb-10 lg:px-0 lg:space-y-6">
      {/* ── Welcome header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between pt-1 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight truncate">
            {loading ? "Dashboard" : `Welcome back, ${firstName}`}
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
        </div>
        {termLabel && (
          <Badge
            variant="secondary"
            className="text-xs lg:text-sm px-2 lg:px-3 py-1 lg:py-1.5 font-medium gap-1 lg:gap-1.5 mt-0.5 shrink-0"
          >
            <Calendar className="h-3 lg:h-3.5 w-3 lg:w-3.5" />
            <span className="hidden sm:inline">{termLabel}</span>
            <span className="sm:hidden">{termLabel.split(" · ")[0]}</span>
          </Badge>
        )}
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatsCard
            label="My Classes"
            value={totalClasses}
            icon={BookOpen}
            variant="info"
            subtitle={`${classTeacherClasses.length} class teacher · ${subjectTeacherClasses.length} subject`}
          />
          <StatsCard
            label="My Students"
            value={totalStudents}
            icon={Users}
            variant="success"
            subtitle="Enrolled in your class(es)"
          />
          <StatsCard
            label="Pending Assessments"
            value={assessmentCounts.draft}
            icon={FileText}
            variant="warning"
            subtitle="Awaiting publication"
          />
          <StatsCard
            label="Completed"
            value={assessmentCounts.completed}
            icon={CheckCircle2}
            variant="primary"
            subtitle="Fully marked assessments"
          />
        </div>
      )}

      {/* ── Main row ───────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Today's Schedule (2/3 width) ─────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0 px-4 lg:px-6">
            <CardTitle className="text-sm lg:text-base font-semibold">
              Today&apos;s Schedule
            </CardTitle>
            <Link href="/teacher/timetable">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 text-muted-foreground"
              >
                Full timetable
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[60px] rounded-lg" />
                ))}
              </div>
            ) : !todayKey ? (
              /* Weekend */
              <div className="flex flex-col items-center justify-center py-14 gap-2 text-muted-foreground">
                <Calendar className="h-10 w-10 opacity-25" />
                <p className="text-sm font-medium">No classes today</p>
                <p className="text-xs opacity-70">Enjoy your weekend!</p>
              </div>
            ) : todaySlots.length === 0 ? (
              /* No slots today */
              <div className="flex flex-col items-center justify-center py-14 gap-2 text-muted-foreground">
                <Clock className="h-10 w-10 opacity-25" />
                <p className="text-sm font-medium">No classes scheduled today</p>
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto space-y-2.5 pr-1">
                {todaySlots.map((slot) => (
                  <PeriodRow key={slot.id} slot={slot} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right column (1/3 width) ─────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Assessment Overview */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm lg:text-base font-semibold">
                Assessments
              </CardTitle>
              <Link href="/teacher/assessments">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1 text-muted-foreground"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {loading ? (
                <>
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                </>
              ) : (
                <>
                  <AssessmentPill
                    label="Draft"
                    count={assessmentCounts.draft}
                    colorClass="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"
                    dotClass="bg-amber-400"
                  />
                  <AssessmentPill
                    label="Published"
                    count={assessmentCounts.published}
                    colorClass="border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20"
                    dotClass="bg-blue-500"
                  />
                  <AssessmentPill
                    label="Completed"
                    count={assessmentCounts.completed}
                    colorClass="border-green-200 bg-green-50/60 dark:border-green-900 dark:bg-green-950/20"
                    dotClass="bg-green-500"
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm lg:text-base font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* ── Mobile: 2×2 icon cards ── */}
              <div className="lg:hidden grid grid-cols-2 gap-2.5">
                {([
                  { href: "/teacher/classes",         icon: ClipboardList, label: "Take Register",   color: "bg-blue-500/10  text-blue-500"  },
                  { href: "/teacher/assessments/new", icon: PlusCircle,    label: "New Assessment",  color: "bg-green-500/10 text-green-500" },
                  { href: "/teacher/assessments",     icon: GraduationCap, label: "Enter Marks",     color: "bg-amber-500/10 text-amber-500" },
                  { href: "/teacher/reports",         icon: FileText,      label: "View Reports",    color: "bg-purple-500/10 text-purple-500"},
                ] as const).map(({ href, icon: Icon, label, color }) => (
                  <Link key={href} href={href}>
                    <div className="flex flex-col items-center gap-2 p-3.5 rounded-xl border bg-card hover:bg-muted/50 active:scale-95 transition-all text-center cursor-pointer">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium leading-tight">{label}</span>
                    </div>
                  </Link>
                ))}
              </div>
              {/* ── Desktop: button list ── */}
              <div className="hidden lg:block space-y-2">
                <Link href="/teacher/classes" className="block">
                  <Button variant="outline" className="w-full justify-start gap-2.5 h-9 text-sm font-medium">
                    <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                    Take Register
                  </Button>
                </Link>
                <Link href="/teacher/assessments/new" className="block">
                  <Button variant="outline" className="w-full justify-start gap-2.5 h-9 text-sm font-medium">
                    <PlusCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    New Assessment
                  </Button>
                </Link>
                <Link href="/teacher/assessments" className="block">
                  <Button variant="outline" className="w-full justify-start gap-2.5 h-9 text-sm font-medium">
                    <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                    Enter Marks
                  </Button>
                </Link>
                <Link href="/teacher/reports" className="block">
                  <Button variant="outline" className="w-full justify-start gap-2.5 h-9 text-sm font-medium">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    View Reports
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
