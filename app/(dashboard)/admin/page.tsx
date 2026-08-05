"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Users,
  GraduationCap,
  School,
  Building2,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  UserPlus,
  PlusCircle,
  ClipboardList,
  AlertCircle,
  Heart,
  LayoutList,
  List,
} from "lucide-react";
import { StatsCard } from "@/components/shared/stats-card";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardStats {
  students: { total: number; active: number };
  teachers: { total: number; active: number };
  classes: { total: number; active: number };
  departments: { total: number; subjects: number };
  academicYear: { year: number | null; termLabel: string | null; termId: string | null };
  assessments: { draft: number; published: number; completed: number; total: number };
  vulnerability: {
    orphan: number;
    orphanMale: number;
    orphanFemale: number;
    singleOrphan: number;
    singleOrphanMale: number;
    singleOrphanFemale: number;
    doubleOrphan: number;
    doubleOrphanMale: number;
    doubleOrphanFemale: number;
    vulnerable: number;
    vulnerableMale: number;
    vulnerableFemale: number;
    specialNeeds: number;
    specialNeedsMale: number;
    specialNeedsFemale: number;
    underFive: number;
    underFiveMale: number;
    underFiveFemale: number;
    total: number;
  };
}

interface TrendPoint {
  date: string;
  male: number;
  female: number;
  total: number;
  malePresent: number;
  femalePresent: number;
  totalPresent: number;
  attendanceRate: number;
}

const trendChartConfig = {
  malePresent: { label: "Male Present", color: "oklch(0.6 0.2 250)" },
  femalePresent: { label: "Female Present", color: "oklch(0.7 0.15 350)" },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[76px] rounded-lg" />
      ))}
    </div>
  );
}

function PipelinePill({
  label,
  count,
  hint,
  colorClass,
  dotClass,
}: {
  label: string;
  count: number;
  hint: string;
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
        <span className="text-xs text-muted-foreground hidden sm:inline">{hint}</span>
      </div>
      <span className="text-sm font-bold tabular-nums">{count}</span>
    </div>
  );
}

function VulnRow({
  label,
  count,
  dotClass,
}: {
  label: string;
  count: number;
  dotClass: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full shrink-0", dotClass)} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums">{count}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [showVulnDetail, setShowVulnDetail] = useState(false);

  const todayLabel = format(new Date(), "EEEE, MMMM d, yyyy");

  // Stats fetch (silent background refresh every minute)

  useEffect(() => {
    async function fetchStats(bg = false) {
      try {
        if (!bg) setStatsLoading(true);
        setStatsError(null);
        const res = await api.get("/admin/dashboard/stats");
        setStats(res.data);
      } catch (err: any) {
        setStatsError(err.message || "Failed to load statistics");
      } finally {
        if (!bg) setStatsLoading(false);
      }
    }
    fetchStats();
    const id = setInterval(() => fetchStats(true), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fetch school-wide 30-day attendance trend (no grade/class filter = all classes)
  useEffect(() => {
    async function fetchTrend() {
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        const res = await api.get(
          `/admin/attendance/analytics?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
        );
        setTrendData(res.data?.trend?.dailyData ?? []);
      } catch {
        setTrendData([]);
      } finally {
        setTrendLoading(false);
      }
    }
    fetchTrend();
  }, []);

  const termBadge =
    !statsLoading && stats?.academicYear.year && stats.academicYear.termLabel
      ? `${stats.academicYear.termLabel} · ${stats.academicYear.year}`
      : null;

  return (
    <div className="space-y-4 px-4 pb-10 lg:px-0 lg:space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between pt-1 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">{todayLabel}</p>
        </div>
        {termBadge && (
          <Badge
            variant="secondary"
            className="text-xs lg:text-sm px-2 lg:px-3 py-1 lg:py-1.5 font-medium gap-1 lg:gap-1.5 mt-0.5 shrink-0"
          >
            <Calendar className="h-3 lg:h-3.5 w-3 lg:w-3.5" />
            <span className="hidden sm:inline">{termBadge}</span>
            <span className="sm:hidden">{termBadge.split(" · ")[0]}</span>
          </Badge>
        )}
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {statsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{statsError}</AlertDescription>
        </Alert>
      )}

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      {statsLoading || !stats ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatsCard
            label="Students"
            value={stats.students.active}
            icon={Users}
            variant="primary"
            subtitle={`${stats.students.total} total enrolled`}
          />
          <StatsCard
            label="Teaching Staff"
            value={stats.teachers.active}
            icon={GraduationCap}
            variant="success"
            subtitle={`${stats.teachers.total} total registered`}
          />
          <StatsCard
            label="Active Classes"
            value={stats.classes.active}
            icon={School}
            variant="info"
            subtitle={`${stats.classes.total} total classes`}
          />
          <StatsCard
            label="Departments"
            value={stats.departments.total}
            icon={Building2}
            variant="warning"
            subtitle={`${stats.departments.subjects} subjects`}
          />
        </div>
      )}

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Left column (2/3) — tabbed card ───────────────────────────── */}
        <Card className="lg:col-span-2">
          <Tabs defaultValue="attendance">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <TabsList className="h-8">
                <TabsTrigger value="attendance" className="text-xs px-3 h-6">
                  <Users className="h-3 w-3 mr-1.5" />
                  Attendance
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="text-xs px-3 h-6">
                  <FileText className="h-3 w-3 mr-1.5" />
                  Pipeline
                </TabsTrigger>
              </TabsList>

              {/* Context label (changes per tab via CSS trick) */}
              {!statsLoading && stats?.academicYear.year && (
                <span className="text-xs text-muted-foreground">
                  {stats.academicYear.termLabel} · {stats.academicYear.year}
                </span>
              )}
            </CardHeader>

            <CardContent className="px-4 pb-4 lg:px-6 lg:pb-6">
              {/* ── Pipeline tab ─────────────────────────────────────────── */}
              <TabsContent value="pipeline" className="mt-0 space-y-2.5">
                {statsLoading || !stats ? (
                  <>
                    <Skeleton className="h-11 rounded-lg" />
                    <Skeleton className="h-11 rounded-lg" />
                    <Skeleton className="h-11 rounded-lg" />
                  </>
                ) : stats.assessments.total === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                    <FileText className="h-8 w-8 opacity-25" />
                    <p className="text-sm">No assessments for the current term</p>
                  </div>
                ) : (
                  <>
                    <PipelinePill
                      label="Draft"
                      count={stats.assessments.draft}
                      hint="— awaiting publication"
                      colorClass="border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"
                      dotClass="bg-amber-400"
                    />
                    <PipelinePill
                      label="Published"
                      count={stats.assessments.published}
                      hint="— currently active"
                      colorClass="border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20"
                      dotClass="bg-blue-500"
                    />
                    <PipelinePill
                      label="Completed"
                      count={stats.assessments.completed}
                      hint="— marked & finalised"
                      colorClass="border-green-200 bg-green-50/60 dark:border-green-900 dark:bg-green-950/20"
                      dotClass="bg-green-500"
                    />
                  </>
                )}
              </TabsContent>

              {/* ── Attendance tab ───────────────────────────────────────── */}
              <TabsContent value="attendance" className="mt-0 space-y-2 lg:space-y-3">
                {trendLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-[140px] w-full rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                  </div>
                ) : trendData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground gap-2">
                    <ClipboardList className="h-8 w-8 opacity-25" />
                    <p className="text-sm">No attendance data for the last 30 days</p>
                  </div>
                ) : (() => {
                  // Enrolled counts are the same for every day — grab from last entry
                  const enrolled = trendData[trendData.length - 1];
                  // Today's present counts
                  const todayKey = new Date().toISOString().split("T")[0];
                  const todayEntry = trendData.find((d) => d.date === todayKey);

                  return (
                    <>
                      {/* Chart */}
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-2">
                          Daily register — 30-day school-wide trend
                        </p>
                        <ChartContainer config={trendChartConfig} className="h-[200px] lg:h-[330px] w-full">
                          <AreaChart data={trendData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                            <defs>
                              <linearGradient id="dashFillMale" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-malePresent)" stopOpacity={0.7} />
                                <stop offset="95%" stopColor="var(--color-malePresent)" stopOpacity={0.05} />
                              </linearGradient>
                              <linearGradient id="dashFillFemale" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-femalePresent)" stopOpacity={0.7} />
                                <stop offset="95%" stopColor="var(--color-femalePresent)" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              tick={{ fontSize: 10 }}
                              width={32}
                              allowDecimals={false}
                            />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={4}
                              minTickGap={24}
                              tick={{ fontSize: 10 }}
                              tickFormatter={(v) =>
                                new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              }
                            />
                            <ChartTooltip
                              cursor={false}
                              content={
                                <ChartTooltipContent
                                  labelFormatter={(v) =>
                                    new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                  }
                                  indicator="dot"
                                />
                              }
                            />
                            <Area dataKey="femalePresent" type="natural" fill="url(#dashFillFemale)" stroke="var(--color-femalePresent)" stackId="a" />
                            <Area dataKey="malePresent" type="natural" fill="url(#dashFillMale)" stroke="var(--color-malePresent)" stackId="a" />
                          </AreaChart>
                        </ChartContainer>
                      </div>

                      {/* Enrolled totals */}
                      <div className="rounded-lg border bg-muted/30 px-3 py-2 lg:px-4 lg:py-3">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Total Enrolled</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold tabular-nums">{enrolled.total}</span>
                          <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                              <span className="text-muted-foreground">Male</span>
                              <span className="font-semibold tabular-nums">{enrolled.male}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-pink-500 shrink-0" />
                              <span className="text-muted-foreground">Female</span>
                              <span className="font-semibold tabular-nums">{enrolled.female}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Today's present */}
                      <div className="rounded-lg border bg-muted/30 px-3 py-2 lg:px-4 lg:py-3">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Present Today
                          {todayEntry && (
                            <span className="ml-1.5 normal-case">
                              · {todayEntry.attendanceRate}% rate
                            </span>
                          )}
                        </p>
                        {!todayEntry || todayEntry.totalPresent === 0 ? (
                          <p className="text-sm text-muted-foreground">No register taken yet today</p>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold tabular-nums">{todayEntry.totalPresent}</span>
                            <div className="flex gap-4 text-sm">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                                <span className="text-muted-foreground">Male</span>
                                <span className="font-semibold tabular-nums">{todayEntry.malePresent}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-pink-500 shrink-0" />
                                <span className="text-muted-foreground">Female</span>
                                <span className="font-semibold tabular-nums">{todayEntry.femalePresent}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* ── Right column (1/3) ─────────────────────────────────────────── */}
        <div className="space-y-4 lg:space-y-5">
          {/* OVC / Vulnerable Students */}
          <Card>
            <CardHeader className="pb-2 lg:pb-3">
              <CardTitle className="flex items-center gap-2 text-sm lg:text-base font-semibold">
                <Heart className="h-4 w-4 text-rose-500" />
                Vulnerable Students
              </CardTitle>
              <CardAction>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {statsLoading || !stats ? "—" : stats.vulnerability.total}
                  </Badge>
                  {!statsLoading && stats && stats.vulnerability.total > 0 && (
                    <button
                      onClick={() => setShowVulnDetail((v) => !v)}
                      className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={showVulnDetail ? "Summary view" : "Detailed view"}
                    >
                      {showVulnDetail
                        ? <List className="h-3.5 w-3.5" />
                        : <LayoutList className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </CardAction>
            </CardHeader>
            <CardContent className="px-4 pb-4 lg:px-6 lg:pb-6">
              {statsLoading || !stats ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-7 rounded" />
                  ))}
                </div>
              ) : stats.vulnerability.total === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No vulnerable students recorded
                </p>
              ) : showVulnDetail ? (
                /* ── Detailed view ──────────────────────────────────── */
                <div className="space-y-3">
                  {/* Orphans breakdown */}
                  <div className="rounded-lg border px-3 py-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                        <span className="text-xs font-semibold">Orphans</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums">{stats.vulnerability.orphan}</span>
                    </div>
                    <div className="pl-3.5 space-y-1.5 border-l border-purple-200 dark:border-purple-900">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Single Orphan</span>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className="text-blue-500 font-medium">M {stats.vulnerability.singleOrphanMale}</span>
                          <span className="text-pink-500 font-medium">F {stats.vulnerability.singleOrphanFemale}</span>
                          <span className="font-semibold w-5 text-right">{stats.vulnerability.singleOrphan}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Double Orphan</span>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className="text-blue-500 font-medium">M {stats.vulnerability.doubleOrphanMale}</span>
                          <span className="text-pink-500 font-medium">F {stats.vulnerability.doubleOrphanFemale}</span>
                          <span className="font-semibold w-5 text-right">{stats.vulnerability.doubleOrphan}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Other categories with gender split */}
                  {[
                    { label: "Vulnerable Children", dotClass: "bg-rose-500", total: stats.vulnerability.vulnerable, male: stats.vulnerability.vulnerableMale, female: stats.vulnerability.vulnerableFemale },
                    { label: "Special Needs",        dotClass: "bg-blue-500",  total: stats.vulnerability.specialNeeds, male: stats.vulnerability.specialNeedsMale, female: stats.vulnerability.specialNeedsFemale },
                    { label: "Under-Five Initiative",dotClass: "bg-amber-500", total: stats.vulnerability.underFive,   male: stats.vulnerability.underFiveMale,   female: stats.vulnerability.underFiveFemale },
                  ].map(({ label, dotClass, total, male, female }) => (
                    <div key={label} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full shrink-0", dotClass)} />
                        <span className="text-xs">{label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs tabular-nums">
                        <span className="text-blue-500 font-medium">M {male}</span>
                        <span className="text-pink-500 font-medium">F {female}</span>
                        <span className="font-semibold w-5 text-right">{total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ── Summary view ───────────────────────────────────── */
                <div className="divide-y divide-border">
                  <VulnRow label="Orphans"              count={stats.vulnerability.orphan}      dotClass="bg-purple-500" />
                  <VulnRow label="Vulnerable Children"  count={stats.vulnerability.vulnerable}  dotClass="bg-rose-500" />
                  <VulnRow label="Special Needs"        count={stats.vulnerability.specialNeeds} dotClass="bg-blue-500" />
                  <VulnRow label="Under-Five Initiative" count={stats.vulnerability.underFive}   dotClass="bg-amber-500" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2 lg:pb-3">
              <span className="text-sm lg:text-base font-semibold">Quick Actions</span>
            </CardHeader>
            <CardContent className="px-3 pb-3 lg:px-6 lg:pb-6">
              {/* ── Mobile: 2×2 icon cards ── */}
              <div className="lg:hidden grid grid-cols-2 gap-2">
                {([
                  { href: "/admin/students/new", icon: UserPlus,      label: "Enrol Student", color: "bg-blue-500/10  text-blue-500"   },
                  { href: "/admin/teachers/new", icon: GraduationCap, label: "Add Teacher",   color: "bg-green-500/10 text-green-500"  },
                  { href: "/admin/reports",      icon: BarChart3,     label: "View Reports",  color: "bg-purple-500/10 text-purple-500" },
                  { href: "/admin/settings",     icon: Settings,      label: "Settings",      color: "bg-amber-500/10 text-amber-500"  },
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
              <div className="hidden lg:block">
                <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                  <Link href="/admin/students/new" className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2.5 h-9 text-sm font-medium"
                    >
                      <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                      Enrol Student
                    </Button>
                  </Link>
                  <Link href="/admin/teachers/new" className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2.5 h-9 text-sm font-medium"
                    >
                      <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                      Add Teacher
                    </Button>
                  </Link>
                  <Link href="/admin/classes/new" className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2.5 h-9 text-sm font-medium"
                    >
                      <PlusCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      Create Class
                    </Button>
                  </Link>
                  <Link href="/admin/attendance/analytics" className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2.5 h-9 text-sm font-medium"
                    >
                      <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                      Attendance Analytics
                    </Button>
                  </Link>
                  <Link href="/admin/reports" className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2.5 h-9 text-sm font-medium"
                    >
                      <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                      View Reports
                    </Button>
                  </Link>
                  <Link href="/admin/timetable" className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2.5 h-9 text-sm font-medium"
                    >
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      Manage Timetable
                    </Button>
                  </Link>
                  <Link href="/admin/settings" className="block">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2.5 h-9 text-sm font-medium"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
                      Settings
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
