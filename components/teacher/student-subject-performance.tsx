"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface AssessmentScore {
  type: "CAT" | "MID" | "EOT";
  score: number;
  rank: number;
  total: number;
  trend: "up" | "down" | "same";
  isAbsent?: boolean;
}

interface StudentSubjectPerformanceProps {
  studentName: string;
  subjectName: string;
  assessments: AssessmentScore[];
  loading?: boolean;
}

const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(217 91% 60%)", // Blue color that works in both light and dark mode
  },
};

export function StudentSubjectPerformance({
  studentName,
  subjectName,
  assessments,
  loading = false,
}: StudentSubjectPerformanceProps) {
  if (loading) {
    return (
      <Card>
        {/* ── Mobile: compact card shape ── */}
        <div className="sm:hidden">
          <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-1">
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full shrink-0" />
          </div>
          <div className="h-[80px] px-4 py-2">
            <Skeleton className="h-full w-full rounded-md" />
          </div>
          <div className="grid grid-cols-3 text-center py-2 border-t mx-4 mt-1 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Skeleton className="h-2.5 w-8" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
          <div className="flex gap-4 px-4 py-2.5 border-t">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-10" />
            ))}
          </div>
        </div>

        {/* ── Desktop: full card shape ── */}
        <div className="hidden sm:block">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-[120px] w-full rounded-md" />
            <div className="grid grid-cols-3 gap-3 pt-2 border-t">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-5 w-10" />
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-2 border-t">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }

  if (assessments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">{studentName}</CardTitle>
              <p className="text-xs text-muted-foreground">{subjectName}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 sm:py-8 text-center text-muted-foreground">
            <p className="text-sm font-medium mb-1">No assessment results yet</p>
            <p className="text-xs">
              Results will appear once assessments are created and graded.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Absent assessments have no real score, so they're excluded from the
  // chart and average — including them as 0 would misrepresent both.
  const presentAssessments = assessments.filter((a) => !a.isAbsent);
  const chartData = presentAssessments.map((a) => ({
    assessment: a.type,
    score: a.score,
  }));

  const latestAssessment = assessments[assessments.length - 1];
  const averageScore =
    presentAssessments.length > 0
      ? presentAssessments.reduce((sum, a) => sum + a.score, 0) / presentAssessments.length
      : 0;

  const trendClass =
    latestAssessment.trend === "up"   ? "bg-green-100 text-green-700 border-green-200"
    : latestAssessment.trend === "down" ? "bg-red-100 text-red-700 border-red-200"
    :                                     "bg-gray-100 text-gray-700 border-gray-200";
  const TrendIcon =
    latestAssessment.trend === "up"   ? TrendingUp
    : latestAssessment.trend === "down" ? TrendingDown
    :                                     Minus;
  const trendLabel =
    latestAssessment.trend === "up" ? "Improving" : latestAssessment.trend === "down" ? "Declining" : "Stable";

  return (
    <Card>
      {/* ── Mobile: compact card with mini chart ── */}
      <div className="sm:hidden">
        {/* Header row: name + trend badge */}
        <div className="flex items-start justify-between gap-2 px-4 pt-3 pb-1">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug truncate">{studentName}</p>
            <p className="text-xs text-muted-foreground truncate">{subjectName}</p>
          </div>
          <Badge variant="outline" className={cn("shrink-0 flex items-center gap-1 text-xs", trendClass)}>
            <TrendIcon className="h-3 w-3" />
            {trendLabel}
          </Badge>
        </div>
        {/* Mini bar chart */}
        <div className="h-[80px] px-1">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="assessment" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={24} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="score" fill="var(--color-score)" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
        {/* Key stats row */}
        <div className="grid grid-cols-3 text-center py-2 border-t mx-4 mt-1">
          <div>
            <p className="text-[10px] text-muted-foreground">Latest</p>
            <p className="text-sm font-bold text-primary">
              {latestAssessment.isAbsent ? "AB" : `${latestAssessment.score}%`}
            </p>
          </div>
          <div className="border-x">
            <p className="text-[10px] text-muted-foreground">Avg</p>
            <p className="text-sm font-bold">{Math.round(averageScore)}%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Rank</p>
            <p className="text-sm font-bold">
              {latestAssessment.isAbsent ? "—" : `${latestAssessment.rank}/${latestAssessment.total}`}
            </p>
          </div>
        </div>
        {/* Score breakdown */}
        <div className="flex gap-4 px-4 py-2.5 border-t">
          {assessments.map((a) => (
            <div key={a.type} className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">{a.type}</span>
              <span className={cn("font-semibold", a.isAbsent && "text-amber-600 dark:text-amber-400")}>
                {a.isAbsent ? "AB" : `${a.score}%`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Desktop: full card with chart ── */}
      <div className="hidden sm:block">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">{studentName}</CardTitle>
              <p className="text-xs text-muted-foreground">{subjectName}</p>
            </div>
            <Badge variant="outline" className={trendClass}>
              <TrendIcon className="h-3 w-3 mr-1" />
              {trendLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Chart */}
          <div className="h-[120px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="assessment" tickLine={false} axisLine={false} className="text-xs" />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="score" fill="var(--color-score)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Latest Score</p>
              <p className="text-lg font-bold text-primary">
                {latestAssessment.isAbsent ? "AB" : `${latestAssessment.score}%`}
              </p>
            </div>
            <div className="text-center border-x">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="text-lg font-bold">{Math.round(averageScore)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Latest Rank</p>
              <p className="text-lg font-bold flex items-center justify-center gap-1">
                <Trophy className="h-4 w-4 text-yellow-600" />
                {latestAssessment.isAbsent ? "—" : `${latestAssessment.rank}/${latestAssessment.total}`}
              </p>
            </div>
          </div>
          {/* Assessment Details */}
          <div className="space-y-1 pt-2 border-t">
            {assessments.map((assessment) => (
              <div key={assessment.type} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">{assessment.type}</span>
                <div className="flex items-center gap-3">
                  {assessment.isAbsent ? (
                    <span className="font-semibold text-amber-600 dark:text-amber-400">AB</span>
                  ) : (
                    <>
                      <span className="font-semibold">{assessment.score}%</span>
                      <span className="text-muted-foreground">Rank {assessment.rank}/{assessment.total}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
