"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  FileText,
  GraduationCap,
  RefreshCw,
  AlertCircle,
  Calendar,
  School,
  FileBarChart,
  ClipboardList,
} from "lucide-react";
import { StatsCard } from "@/components/shared/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useHodDashboard } from "@/hooks/useHodDashboard";
import { useToast } from "@/hooks/use-toast";
import { useMobileHeaderRefresh } from "@/hooks/useMobileHeaderRefresh";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TermOption {
  id: string;
  label: string;
  academicYearId: string;
  academicYear: string;
  isActive: boolean;
}

interface YearOption {
  id: string;
  year: string;
}

interface PerformanceData {
  averagePerformance: number;
  passRate: number;
  bestPerformingSubject: { name: string; average: number } | null;
  subjectNeedingAttention: { name: string; average: number } | null;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TERM_LABELS: Record<string, string> = {
  TERM_1: "Term 1",
  TERM_2: "Term 2",
  TERM_3: "Term 3",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

// ── Skeletons ──────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[76px] rounded-lg" />
      ))}
    </div>
  );
}

// ── Metric pill ────────────────────────────────────────────────────────────────

function MetricPill({
  label,
  value,
  colorClass,
  dotClass,
}: {
  label: string;
  value: string;
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
      <span className="text-sm font-bold tabular-nums">{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HodDashboard() {
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useHodDashboard();

  // Performance filter state
  const [perfSubject, setPerfSubject] = useState("all");
  const [perfYear, setPerfYear] = useState("all");
  const [perfTerm, setPerfTerm] = useState("all");
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [years, setYears] = useState<YearOption[]>([]);
  const [filteredPerf, setFilteredPerf] = useState<PerformanceData | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  // Fetch terms once the main data is available
  useEffect(() => {
    if (!data) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    fetch("/api/terms?pageSize=50", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (!res.data) return;
        const termOptions: TermOption[] = res.data.map((t: any) => ({
          id: t.id,
          label: `${TERM_LABELS[t.termType] ?? t.termType} · ${t.academicYear.year}`,
          academicYearId: t.academicYear.id,
          academicYear: String(t.academicYear.year),
          isActive: t.isActive,
        }));
        setTerms(termOptions);

        // Derive unique years
        const yearMap = new Map<string, string>();
        termOptions.forEach((t) => yearMap.set(t.academicYearId, t.academicYear));
        setYears(
          Array.from(yearMap.entries()).map(([id, year]) => ({ id, year }))
        );
      })
      .catch(() => {});
  }, [data]);

  // Fetch filtered performance whenever filters change
  useEffect(() => {
    if (!data) return;
    const isDefault =
      perfSubject === "all" && perfYear === "all" && perfTerm === "all";
    if (isDefault) {
      setFilteredPerf(null);
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const params = new URLSearchParams();
    if (perfSubject !== "all") params.set("subjectId", perfSubject);
    if (perfTerm !== "all") {
      params.set("termId", perfTerm);
    } else if (perfYear !== "all") {
      params.set("academicYearId", perfYear);
    }

    setPerfLoading(true);
    fetch(`/api/hod/performance?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) setFilteredPerf(res.data);
      })
      .catch(() => {})
      .finally(() => setPerfLoading(false));
  }, [data, perfSubject, perfYear, perfTerm]);

  // When year changes, reset term if it doesn't belong to the new year
  const handleYearChange = (value: string) => {
    setPerfYear(value);
    if (value !== "all") {
      const term = terms.find((t) => t.id === perfTerm);
      if (term && term.academicYearId !== value) setPerfTerm("all");
    }
  };

  const handleRefresh = () => {
    refetch();
    toast({ title: "Refreshing", description: "Updating dashboard data..." });
  };

  // On mobile, the refresh action lives as an icon next to the notification
  // bell in the layout's header instead of the inline "Refresh" button below.
  useMobileHeaderRefresh(handleRefresh, isLoading);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="font-semibold">Error Loading Dashboard</h3>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoading && !data && !error) return null;

  // Performance data to display: filtered if available, else dashboard default
  const perf = filteredPerf ?? data?.performance ?? null;

  // Terms visible in dropdown (filtered by selected year)
  const visibleTerms =
    perfYear === "all"
      ? terms
      : terms.filter((t) => t.academicYearId === perfYear);

  return (
    <div className="space-y-4 px-4 pb-10 lg:px-0 lg:space-y-6">
      {/* ── Welcome header ─────────────────────────────────────────────────── */}
      {/* Extra top breathing room on mobile, clear of the sticky top bar — unchanged on lg+ */}
      <div className="flex items-start justify-between pt-5 lg:pt-1 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight truncate">
            {isLoading ? "Department Dashboard" : data!.department.name}
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading…"
              : `${data!.academicYear.year}${data!.department.code ? ` · ${data!.department.code}` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-0.5 shrink-0">
          {!isLoading && data?.term?.name && (
            <Badge
              variant="secondary"
              className="text-xs lg:text-sm px-2 lg:px-3 py-1 lg:py-1.5 font-medium gap-1 lg:gap-1.5 mt-0.5 shrink-0"
            >
              <Calendar className="h-3 lg:h-3.5 w-3 lg:w-3.5" />
              <span className="hidden sm:inline">{data.term.name}</span>
              <span className="sm:hidden">{data.term.name.split(" · ")[0]}</span>
            </Badge>
          )}
          {/* Desktop only — mobile gets an icon-only refresh next to the notification bell instead */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="hidden lg:inline-flex"
          >
            <RefreshCw
              className={cn("h-4 w-4 lg:mr-2", isLoading && "animate-spin")}
            />
            <span className="hidden lg:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatsCard
            label="Total Assessments"
            value={data!.stats.totalAssessments}
            icon={FileText}
            variant="info"
            subtitle="Across all subjects"
          />
          <StatsCard
            label="Pending Assessments"
            value={data!.stats.pendingAssessments}
            icon={AlertCircle}
            variant="warning"
            subtitle="Awaiting completion"
          />
          <StatsCard
            label="Active Classes"
            value={data!.stats.activeClasses}
            icon={BookOpen}
            variant="primary"
            subtitle={`${data!.department.totalSubjects} subjects`}
          />
          <StatsCard
            label="Total Students"
            value={data!.stats.totalStudents}
            icon={GraduationCap}
            variant="success"
            subtitle={`${data!.department.totalTeachers} teachers`}
          />
        </div>
      )}

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Left column (2/3) ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-5">
          {/* Performance Overview */}
          <Card>
            <CardHeader className="pb-3 space-y-3">
              <CardTitle className="text-sm lg:text-base font-semibold">
                Performance Overview
              </CardTitle>
              {/* Filters — subject + year share the first row, term spans the second */}
              {!isLoading && (
                <div className="grid grid-cols-2 gap-2">
                  {/* Subject */}
                  <Select value={perfSubject} onValueChange={setPerfSubject}>
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="All subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All subjects</SelectItem>
                      {data!.subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Year */}
                  <Select value={perfYear} onValueChange={handleYearChange}>
                    <SelectTrigger className="h-8 text-xs w-full">
                      <SelectValue placeholder="All years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All years</SelectItem>
                      {years.map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          {y.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Term — spans the full row below */}
                  <Select value={perfTerm} onValueChange={setPerfTerm}>
                    <SelectTrigger className="h-8 text-xs w-full col-span-2">
                      <SelectValue placeholder="All terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All terms</SelectItem>
                      {visibleTerms.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                          {t.isActive && (
                            <span className="ml-1 text-green-600">(Active)</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-2.5">
              {isLoading || perfLoading ? (
                <>
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                </>
              ) : perf ? (
                <>
                  <MetricPill
                    label="Average Performance"
                    value={`${perf.averagePerformance}%`}
                    colorClass="border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20"
                    dotClass="bg-blue-500"
                  />
                  <MetricPill
                    label="Pass Rate"
                    value={`${perf.passRate}%`}
                    colorClass="border-green-200 bg-green-50/60 dark:border-green-900 dark:bg-green-950/20"
                    dotClass="bg-green-500"
                  />
                  {perf.bestPerformingSubject && (
                    <MetricPill
                      label={`Best: ${perf.bestPerformingSubject.name}`}
                      value={`${perf.bestPerformingSubject.average}%`}
                      colorClass="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20"
                      dotClass="bg-emerald-500"
                    />
                  )}
                  {perf.subjectNeedingAttention && (
                    <MetricPill
                      label={`Needs attention: ${perf.subjectNeedingAttention.name}`}
                      value={`${perf.subjectNeedingAttention.average}%`}
                      colorClass="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"
                      dotClass="bg-amber-400"
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No performance data available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Subjects */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm lg:text-base font-semibold">Subjects</CardTitle>
              <Badge variant="outline" className="text-xs">
                {isLoading ? "—" : data!.department.totalSubjects}
              </Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 rounded-lg" />
                  ))}
                </div>
              ) : data!.subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No subjects assigned
                </p>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {data!.subjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-card"
                    >
                      <span className="text-sm font-medium">{subject.name}</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-mono"
                      >
                        {subject.code}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column (1/3) ─────────────────────────────────────────── */}
        <div className="space-y-4 lg:space-y-5">
          {/* Teachers */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm lg:text-base font-semibold">Teachers</CardTitle>
              <Badge variant="outline" className="text-xs">
                {isLoading ? "—" : data!.department.totalTeachers}
              </Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : data!.teachers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No teachers assigned
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                  {data!.teachers.map((teacher) => (
                    <div key={teacher.id} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {initials(teacher.firstName, teacher.lastName)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {teacher.firstName} {teacher.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {teacher.staffNumber}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                          teacher.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {teacher.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2 lg:pb-3">
              <CardTitle className="text-sm lg:text-base font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 lg:px-6 lg:pb-6">
              {/* ── Mobile: 2×2 icon cards ── */}
              <div className="lg:hidden grid grid-cols-2 gap-2">
                {([
                  { href: "/hod/assessments", icon: ClipboardList, label: "View Assessments", color: "bg-blue-500/10 text-blue-500"    },
                  { href: "/hod/reports",     icon: FileBarChart,  label: "Dept Reports",     color: "bg-purple-500/10 text-purple-500" },
                  { href: "/hod/teachers",    icon: Users,         label: "Manage Teachers",  color: "bg-green-500/10 text-green-500"  },
                  { href: "/hod/subjects",    icon: School,        label: "View Subjects",    color: "bg-amber-500/10 text-amber-500"  },
                ] as const).map(({ href, icon: Icon, label, color }) => (
                  <Link key={href} href={href}>
                    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-card hover:bg-muted/50 active:scale-95 transition-all text-center cursor-pointer">
                      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", color)}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-xs font-medium leading-tight">{label}</span>
                    </div>
                  </Link>
                ))}
              </div>
              {/* ── Desktop: button list ── */}
              <div className="hidden lg:block space-y-2">
                <Link href="/hod/assessments" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2.5 h-9 text-sm font-medium"
                  >
                    <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                    View Assessments
                  </Button>
                </Link>
                <Link href="/hod/reports" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2.5 h-9 text-sm font-medium"
                  >
                    <FileBarChart className="h-4 w-4 text-muted-foreground shrink-0" />
                    Department Reports
                  </Button>
                </Link>
                <Link href="/hod/teachers" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2.5 h-9 text-sm font-medium"
                  >
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    Manage Teachers
                  </Button>
                </Link>
                <Link href="/hod/subjects" className="block">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2.5 h-9 text-sm font-medium"
                  >
                    <School className="h-4 w-4 text-muted-foreground shrink-0" />
                    View Subjects
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
