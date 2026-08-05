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

interface SubjectRanking {
  subject: string;
  score: number;
  rank: number;
  total: number;
  trend: "up" | "down" | "same";
  isTeacherSubject: boolean;
}

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
            <div className="overflow-hidden rounded-lg border">
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
                            {item.trend === "up" && (
                              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted">
                                <TrendingUp className="h-3 w-3" />
                              </div>
                            )}
                            {item.trend === "down" && (
                              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted">
                                <TrendingDown className="h-3 w-3" />
                              </div>
                            )}
                            {item.trend === "same" && (
                              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted">
                                <Minus className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
