"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SubjectRanking {
  subject: string;
  subjectCode: string;
  score: number;
  rank: number;
  total: number;
  trend: "up" | "down" | "same";
  isTeacherSubject: boolean;
}

const TrendIcon = ({ trend }: { trend: SubjectRanking["trend"] }) => {
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  return (
    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted shrink-0">
      <Icon className={cn("h-3 w-3", trend === "same" && "text-muted-foreground")} />
    </div>
  );
};

interface StudentClassRankingsProps {
  studentId: string;
  assessmentType: "CAT1" | "MID" | "EOT";
  teacherSubjects: string[];
  data?: SubjectRanking[];
  onSubjectClick?: (subject: SubjectRanking) => void;
}

export function StudentClassRankings({
  studentId,
  assessmentType,
  teacherSubjects,
  data,
  onSubjectClick,
}: StudentClassRankingsProps) {
  // TODO: Fetch real data from API based on studentId and assessmentType
  const rankings = data || [];

  const handleRowClick = (ranking: SubjectRanking) => {
    // Removed click interaction - rankings are view-only
    return;
  };

  return (
    <Card className="h-[450px] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Class Rankings</CardTitle>
            <CardDescription className="text-xs">
              Student's position across all subjects
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            {rankings.length > 0 ? `Total: ${rankings[0].total}` : "N/A"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 pb-4">
        <ScrollArea className="h-full">
          {rankings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-4">
              <p className="text-sm font-medium mb-1">No assessment results yet</p>
              <p className="text-xs">
                Rankings will appear once assessments are created and results are recorded.
              </p>
            </div>
          ) : (
            <>
              {/* ── Mobile: compact card rows — subject code instead of the
                  full name (the name plus Score/Rank/Trend columns was
                  overflowing the card and clipping the Trend column since
                  the wrapper only had overflow-hidden, no scroll). ────── */}
              <div className="lg:hidden divide-y rounded-lg border overflow-hidden">
                {rankings.map((item, index) => {
                  const canView = item.isTeacherSubject;
                  return (
                    <div
                      key={item.subject}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5",
                        canView && "bg-green-50/30"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0",
                          canView
                            ? "bg-green-100 text-green-700"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm truncate">
                            {item.subjectCode || item.subject}
                          </p>
                          {canView && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 shrink-0 bg-green-50 text-green-700 border-green-200"
                            >
                              Yours
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.score}% · Rank {item.rank}
                        </p>
                      </div>
                      <TrendIcon trend={item.trend} />
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop: full table — unchanged ─────────────────────── */}
              <div className="hidden lg:block overflow-hidden rounded-lg border">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-16">
                        No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                        Subject
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-20">
                        Score
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-24">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground w-20">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((item, index) => {
                      const canView = item.isTeacherSubject;
                      return (
                        <tr
                          key={item.subject}
                          className={`group border-b transition-colors ${
                            canView
                              ? "bg-green-50/30"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div
                              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors ${
                                canView
                                  ? "bg-green-100 text-green-700"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">
                                {item.subject}
                              </p>
                              {canView && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-green-50 text-green-700 border-green-200"
                                >
                                  Your Subject
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-medium text-sm">
                              {item.score}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <p className="text-sm font-bold">{item.rank}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <TrendIcon trend={item.trend} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
