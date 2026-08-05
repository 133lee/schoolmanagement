"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Award, Users, CheckCircle, XCircle, Percent, FileWarning } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/shared/stats-card";

interface StudentPerformance {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  averageMark: number;
  position: number;
  gender: string;
}

interface ImprovementStudent {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  currentAverage: number;
  previousAverage: number;
  improvement: number;
  position: number;
  previousPosition: number;
}

interface PerformanceData {
  passed: StudentPerformance[];
  failed: StudentPerformance[];
  topImprovers: ImprovementStudent[];
  stats: {
    totalStudents: number;
    passedCount: number;
    failedCount: number;
    passRate: number;
  };
}

interface PerformanceListsContentProps {
  classId: string;
  termId: string;
  apiEndpoint?: string;
}

export function PerformanceListsContent({
  classId,
  termId,
  apiEndpoint,
}: PerformanceListsContentProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (!classId || !termId) {
        setError("Missing class or term information");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem("auth_token");
        const endpoint = apiEndpoint ?? "/api/hod/reports/performance";
        const response = await fetch(
          `${endpoint}?classId=${classId}&termId=${termId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch performance data");
        }

        const result = await response.json();
        // Handle ApiResponse wrapper: { success: true, data: {...} }
        const data = result.data || result;
        setPerformanceData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, [classId, termId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(col => (
          <Card key={col}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48 mt-1" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className={`h-3 ${["w-32","w-28","w-36","w-24","w-32","w-28","w-36","w-24"][i]}`} />
                    <Skeleton className="h-2 w-16" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] space-y-4">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (performanceData?.stats.totalStudents === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <FileWarning className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium text-foreground">
              No report cards found for this class and term
            </p>
            <p className="text-sm mt-2 max-w-md">
              Performance Lists reads from generated report cards, not raw scores directly.
              Generate report cards for this class and term first, then come back here.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/admin/report-cards">Go to Report Cards</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      {performanceData?.stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            label="Total Students"
            value={performanceData.stats.totalStudents}
            icon={Users}
            variant="info"
          />
          <StatsCard
            label="Passed"
            value={performanceData.stats.passedCount}
            icon={CheckCircle}
            variant="success"
          />
          <StatsCard
            label="Failed"
            value={performanceData.stats.failedCount}
            icon={XCircle}
            variant="danger"
          />
          <StatsCard
            label="Pass Rate"
            value={`${performanceData.stats.passRate.toFixed(1)}%`}
            icon={Percent}
            variant="primary"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Passed Students List */}
        <div className="lg:col-span-1">
          <Card className="flex flex-col h-[calc(100vh-20rem)]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Passed Students
              </CardTitle>
              <CardDescription className="text-xs">
                Students who achieved passing grades
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-4">
                  {performanceData?.passed.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No students passed
                    </p>
                  ) : (
                    performanceData?.passed.map((student, index) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {student.studentNumber}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            {student.averageMark.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pos: {student.position}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Failed Students List */}
        <div className="lg:col-span-1">
          <Card className="flex flex-col h-[calc(100vh-20rem)]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Failed Students
              </CardTitle>
              <CardDescription className="text-xs">
                Students who need additional support
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-4">
                  {performanceData?.failed.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No students failed
                    </p>
                  ) : (
                    performanceData?.failed.map((student, index) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {student.studentNumber}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">
                            {student.averageMark.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pos: {student.position}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Top 3 Most Improved */}
        <div className="lg:col-span-1">
          <Card className="flex flex-col h-[calc(100vh-20rem)]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-600" />
                Most Improved
              </CardTitle>
              <CardDescription className="text-xs">
                Top 3 students with greatest improvement
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-4">
                  {performanceData?.topImprovers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No improvement data available
                    </p>
                  ) : (
                    performanceData?.topImprovers.slice(0, 3).map((student, index) => {
                      const positionChange = student.previousPosition - student.position;
                      const medalColors = ["gold", "silver", "#cd7f32"]; // Gold, Silver, Bronze
                      const medalColor = medalColors[index] || "gray";

                      return (
                        <div
                          key={student.id}
                          className="p-4 border-2 rounded-lg bg-gradient-to-br from-background to-muted/30"
                          style={{ borderColor: medalColor }}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-white text-lg shadow-lg"
                                style={{ backgroundColor: medalColor }}
                              >
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">
                                  {student.firstName} {student.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {student.studentNumber}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-700"
                            >
                              +{student.improvement.toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Previous</p>
                              <p className="font-semibold">
                                {student.previousAverage.toFixed(1)}%
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Pos: {student.previousPosition}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Current</p>
                              <p className="font-semibold text-green-600">
                                {student.currentAverage.toFixed(1)}%
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Pos: {student.position}
                                {positionChange > 0 && (
                                  <span className="text-green-600 ml-1">
                                    (+{positionChange})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
