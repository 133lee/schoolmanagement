"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/shared/stats-card";
import {
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  Award,
  Heart,
  Baby,
  BarChart3,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type GenderBucket = { total: number; male: number; female: number };

interface TeacherStats {
  total: number;
  byGender: { MALE: number; FEMALE: number };
  byStatus: Record<string, GenderBucket>;
  byQualification: Record<string, GenderBucket>;
  byAgeGroup: Record<string, GenderBucket>;
  byExperience: Record<string, GenderBucket>;
  departments: Array<{ id: string; name: string }>;
}

interface StudentStats {
  total: number;
  byGender: { MALE: number; FEMALE: number };
  byStatus: Record<string, GenderBucket>;
  byAgeGroup: Record<string, GenderBucket>;
  byVulnerability: Record<string, GenderBucket>;
  byGrade: Array<{ name: string; sequence: number; total: number; male: number; female: number }>;
  grades: Array<{ id: string; name: string; sequence: number }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

const QUALIFICATION_LABELS: Record<string, string> = {
  CERTIFICATE: "Certificate",
  DIPLOMA: "Diploma",
  DEGREE: "Degree",
  MASTERS: "Masters",
  DOCTORATE: "Doctorate",
};

const QUALIFICATION_ORDER = ["CERTIFICATE", "DIPLOMA", "DEGREE", "MASTERS", "DOCTORATE"];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500",
  ON_LEAVE: "bg-yellow-500",
  SUSPENDED: "bg-orange-500",
  TERMINATED: "bg-red-500",
  RETIRED: "bg-gray-400",
};

const STUDENT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500",
  SUSPENDED: "bg-orange-500",
  TRANSFERRED: "bg-blue-500",
  GRADUATED: "bg-purple-500",
  WITHDRAWN: "bg-yellow-500",
  DECEASED: "bg-gray-400",
};

const VULN_LABELS: Record<string, string> = {
  NOT_VULNERABLE: "Not Vulnerable",
  ORPHAN: "Orphan",
  VULNERABLE_CHILD: "Vulnerable Child",
  SPECIAL_NEEDS: "Special Needs",
  UNDER_FIVE_INITIATIVE: "Under-Five Initiative",
};

const VULN_COLORS: Record<string, string> = {
  NOT_VULNERABLE: "bg-green-500",
  ORPHAN: "bg-orange-500",
  VULNERABLE_CHILD: "bg-yellow-500",
  SPECIAL_NEEDS: "bg-blue-500",
  UNDER_FIVE_INITIATIVE: "bg-purple-500",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * BreakdownBar — horizontal bar for a single category with optional gender split.
 *
 * When `male` / `female` are provided:
 *  - The right side shows "M {n}  F {n}" in blue/pink before the % and total.
 *  - The filled portion of the bar is itself split blue (male) / pink (female).
 */
function BreakdownBar({
  label,
  value,
  total,
  color = "bg-primary",
  badge,
  male,
  female,
}: {
  label: string;
  value: number;
  total: number;
  color?: string;
  badge?: string;
  male?: number;
  female?: number;
}) {
  const percent = pct(value, total);
  const hasSplit = male !== undefined && female !== undefined && value > 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{label}</span>
          {badge && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 tabular-nums shrink-0 ml-2">
          {hasSplit && (
            <>
              <span className="text-blue-500 text-xs font-medium">M {male}</span>
              <span className="text-pink-500 text-xs font-medium">F {female}</span>
            </>
          )}
          <span className="text-muted-foreground text-xs">{percent}%</span>
          <span className="font-semibold w-8 text-right">{value}</span>
        </div>
      </div>

      {/* Bar: full width = 100% of container; filled portion = pct(value,total);
          within filled portion, blue = male share, pink = female share */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div className="h-full flex" style={{ width: `${percent}%` }}>
          {hasSplit ? (
            <>
              {male! > 0 && (
                <div
                  className="bg-blue-400 h-full transition-all duration-500"
                  style={{ width: `${pct(male!, value)}%` }}
                />
              )}
              {female! > 0 && (
                <div
                  className="bg-pink-400 h-full transition-all duration-500"
                  style={{ width: `${pct(female!, value)}%` }}
                />
              )}
            </>
          ) : (
            <div className={`${color} h-full w-full transition-all duration-500`} />
          )}
        </div>
      </div>
    </div>
  );
}

/** Small M/F legend shown at the bottom of every gender-split card */
function GenderLegend() {
  return (
    <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground border-t mt-1">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-2 rounded-sm bg-blue-400" />
        Male
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-2 rounded-sm bg-pink-400" />
        Female
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Teacher Tab ──────────────────────────────────────────────────────────────

function TeacherStatsTab() {
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("all");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();
      if (deptFilter !== "all") params.set("departmentId", deptFilter);
      const res = await fetch(`/api/admin/stats/teachers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setStats(json.data);
    } finally {
      setLoading(false);
    }
  }, [deptFilter]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const active  = stats?.byStatus?.ACTIVE?.total ?? 0;
  const male    = stats?.byGender?.MALE   ?? 0;
  const female  = stats?.byGender?.FEMALE ?? 0;
  const total   = stats?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {stats?.departments?.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!loading && stats && (
          <span className="text-sm text-muted-foreground">
            {total} teacher{total !== 1 ? "s" : ""} found
          </span>
        )}
      </div>

      {/* Summary StatsCards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard label="Total Teachers" value={loading ? "—" : total}  icon={GraduationCap} variant="primary"  subtitle="All staff" />
        <StatsCard label="Active"         value={loading ? "—" : active} icon={UserCheck}     variant="success"  subtitle={loading ? "" : `${pct(active, total)}% of total`} />
        <StatsCard label="Male"           value={loading ? "—" : male}   icon={Users}         variant="info"     subtitle={loading ? "" : `${pct(male,   total)}% of total`} />
        <StatsCard label="Female"         value={loading ? "—" : female} icon={Users}         variant="warning"  subtitle={loading ? "" : `${pct(female, total)}% of total`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Qualifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              Qualification Level
            </CardTitle>
            <CardDescription className="text-xs">Academic credentials held by teaching staff</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <SectionSkeleton /> : (
              <>
                {QUALIFICATION_ORDER.map((key) => {
                  const bucket = stats?.byQualification?.[key] ?? { total: 0, male: 0, female: 0 };
                  const colors: Record<string, string> = {
                    CERTIFICATE: "bg-slate-500",
                    DIPLOMA:     "bg-blue-500",
                    DEGREE:      "bg-indigo-500",
                    MASTERS:     "bg-purple-500",
                    DOCTORATE:   "bg-pink-500",
                  };
                  return (
                    <BreakdownBar
                      key={key}
                      label={QUALIFICATION_LABELS[key]}
                      value={bucket.total}
                      total={total}
                      color={colors[key]}
                      male={bucket.male}
                      female={bucket.female}
                    />
                  );
                })}
                <GenderLegend />
              </>
            )}
          </CardContent>
        </Card>

        {/* Age Groups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Age Distribution
            </CardTitle>
            <CardDescription className="text-xs">Teacher age groups across the school</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <SectionSkeleton /> : (
              <>
                {Object.entries(stats?.byAgeGroup ?? {}).map(([group, bucket]) => (
                  <BreakdownBar
                    key={group}
                    label={group}
                    value={bucket.total}
                    total={total}
                    color="bg-teal-500"
                    male={bucket.male}
                    female={bucket.female}
                  />
                ))}
                <GenderLegend />
              </>
            )}
          </CardContent>
        </Card>

        {/* Employment Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              Employment Status
            </CardTitle>
            <CardDescription className="text-xs">Current staff employment breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <SectionSkeleton /> : (
              <>
                {Object.entries(stats?.byStatus ?? {}).map(([status, bucket]) => (
                  <BreakdownBar
                    key={status}
                    label={status.replace(/_/g, " ")}
                    value={bucket.total}
                    total={total}
                    color={STATUS_COLORS[status] ?? "bg-gray-400"}
                    male={bucket.male}
                    female={bucket.female}
                  />
                ))}
                <GenderLegend />
              </>
            )}
          </CardContent>
        </Card>

        {/* Experience */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Years of Experience
            </CardTitle>
            <CardDescription className="text-xs">Teaching experience across staff</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <SectionSkeleton /> : (
              <>
                {Object.entries(stats?.byExperience ?? {}).map(([group, bucket]) => (
                  <BreakdownBar
                    key={group}
                    label={group}
                    value={bucket.total}
                    total={total}
                    color="bg-amber-500"
                    male={bucket.male}
                    female={bucket.female}
                  />
                ))}
                <GenderLegend />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Student Tab ──────────────────────────────────────────────────────────────

function StudentStatsTab() {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();
      if (gradeFilter !== "all") params.set("gradeId", gradeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/stats/students?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setStats(json.data);
    } finally {
      setLoading(false);
    }
  }, [gradeFilter, statusFilter]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const total     = stats?.total ?? 0;
  const male      = stats?.byGender?.MALE   ?? 0;
  const female    = stats?.byGender?.FEMALE ?? 0;
  const active    = stats?.byStatus?.ACTIVE?.total ?? 0;
  const vulnerable = Object.entries(stats?.byVulnerability ?? {})
    .filter(([k]) => k !== "NOT_VULNERABLE")
    .reduce((sum, [, b]) => sum + b.total, 0);

  return (
    <div className="space-y-6">
      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {stats?.grades?.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["ACTIVE", "SUSPENDED", "TRANSFERRED", "GRADUATED", "WITHDRAWN", "DECEASED"].map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!loading && stats && (
          <span className="text-sm text-muted-foreground">
            {total} student{total !== 1 ? "s" : ""} found
          </span>
        )}
      </div>

      {/* Summary StatsCards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard label="Total Students" value={loading ? "—" : total}  icon={Users}    variant="primary"  subtitle="All records" />
        <StatsCard label="Active"         value={loading ? "—" : active} icon={UserCheck} variant="success" subtitle={loading ? "" : `${pct(active, total)}% enrolled`} />
        <StatsCard label="Male"           value={loading ? "—" : male}   icon={Baby}      variant="info"    subtitle={loading ? "" : `${pct(male,   total)}% of total`} />
        <StatsCard label="Female"         value={loading ? "—" : female} icon={Baby}      variant="warning" subtitle={loading ? "" : `${pct(female, total)}% of total`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Age Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Age Distribution
            </CardTitle>
            <CardDescription className="text-xs">Student age groups across the school</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <SectionSkeleton /> : (
              <>
                {Object.entries(stats?.byAgeGroup ?? {}).map(([group, bucket]) => (
                  <BreakdownBar
                    key={group}
                    label={group}
                    value={bucket.total}
                    total={total}
                    color="bg-blue-500"
                    male={bucket.male}
                    female={bucket.female}
                  />
                ))}
                <GenderLegend />
              </>
            )}
          </CardContent>
        </Card>

        {/* Enrolment Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Enrolment Status
            </CardTitle>
            <CardDescription className="text-xs">Student status across all records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <SectionSkeleton /> : (
              <>
                {Object.entries(stats?.byStatus ?? {}).map(([status, bucket]) => (
                  <BreakdownBar
                    key={status}
                    label={status.charAt(0) + status.slice(1).toLowerCase()}
                    value={bucket.total}
                    total={total}
                    color={STUDENT_STATUS_COLORS[status] ?? "bg-gray-400"}
                    male={bucket.male}
                    female={bucket.female}
                  />
                ))}
                <GenderLegend />
              </>
            )}
          </CardContent>
        </Card>

        {/* Vulnerability */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="h-4 w-4 text-muted-foreground" />
                  Vulnerability Status
                </CardTitle>
                <CardDescription className="text-xs">OVC and special needs breakdown</CardDescription>
              </div>
              {!loading && vulnerable > 0 && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {vulnerable} OVC
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <SectionSkeleton /> : (
              <>
                {Object.entries(stats?.byVulnerability ?? {}).map(([key, bucket]) => (
                  <BreakdownBar
                    key={key}
                    label={VULN_LABELS[key] ?? key}
                    value={bucket.total}
                    total={total}
                    color={VULN_COLORS[key] ?? "bg-gray-400"}
                    male={bucket.male}
                    female={bucket.female}
                  />
                ))}
                <GenderLegend />
              </>
            )}
          </CardContent>
        </Card>

        {/* Enrolment by Grade */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              Enrolment by Grade
            </CardTitle>
            <CardDescription className="text-xs">Student count and gender split per grade</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SectionSkeleton />
            ) : !stats?.byGrade?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No grade data available</p>
            ) : (
              <div className="space-y-2">
                {stats.byGrade.map((g) => (
                  <div key={g.name} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-20 shrink-0">{g.name}</span>
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden flex">
                      {g.male > 0 && (
                        <div
                          className="bg-blue-400 h-full"
                          style={{ width: `${pct(g.male, g.total)}%` }}
                          title={`Male: ${g.male}`}
                        />
                      )}
                      {g.female > 0 && (
                        <div
                          className="bg-pink-400 h-full"
                          style={{ width: `${pct(g.female, g.total)}%` }}
                          title={`Female: ${g.female}`}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs tabular-nums shrink-0">
                      <span className="text-blue-500 font-medium">{g.male}M</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-pink-500 font-medium">{g.female}F</span>
                      <span className="text-muted-foreground font-semibold">= {g.total}</span>
                    </div>
                  </div>
                ))}
                <GenderLegend />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchoolStatisticsPage() {
  return (
    <div className="space-y-6 px-4 lg:px-0 pb-10">
      <div className="mt-2">
        <h1 className="text-xl font-bold">School Statistics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Demographic and institutional overview of teachers and students
        </p>
      </div>

      <Tabs defaultValue="teachers">
        <TabsList className="mb-2">
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Teachers
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Students
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teachers">
          <TeacherStatsTab />
        </TabsContent>

        <TabsContent value="students">
          <StudentStatsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
