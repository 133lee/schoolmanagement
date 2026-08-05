"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ClassRankingCardProps {
  classPosition?: number;
  classTotal?: number;
  bestSix?: number | string | null;
  bestSixCount?: number | null;
  bestSixType?: "points" | "standard_points" | "percentage";
  overallAverage?: number;
  trend?: "up" | "down" | "same";
  subjectRankings?: Array<{
    subject: string;
    score: number;
    rank: number;
    total: number;
  }>;
  loading?: boolean;
}

export function ClassRankingCard({
  classPosition,
  classTotal,
  bestSix: propBestSix,
  bestSixCount,
  bestSixType = "percentage",
  overallAverage,
  trend = "same",
  subjectRankings = [],
  loading = false,
}: ClassRankingCardProps) {
  // Format best six based on type
  const bestSix =
    propBestSix !== undefined && propBestSix !== null
      ? typeof propBestSix === "number"
        ? bestSixType === "points" || bestSixType === "standard_points"
          ? `${propBestSix} Points`
          : `${propBestSix}%`
        : propBestSix
      : "N/A";

  // Get medal/trophy icon based on position
  const getRankIcon = () => {
    if (!classPosition || !classTotal) return null;

    const topPercentile = (classPosition / classTotal) * 100;

    if (classPosition === 1) {
      return <Trophy className="h-12 w-12 text-yellow-500" />;
    } else if (classPosition === 2) {
      return <Medal className="h-12 w-12 text-gray-400" />;
    } else if (classPosition === 3) {
      return <Medal className="h-12 w-12 text-amber-600" />;
    } else if (topPercentile <= 10) {
      return <Award className="h-12 w-12 text-blue-500" />;
    } else if (topPercentile <= 25) {
      return <Award className="h-12 w-12 text-green-500" />;
    }
    return <Award className="h-12 w-12 text-muted-foreground" />;
  };

  // Get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <Card className="h-[450px] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Class Ranking</CardTitle>
            <CardDescription className="text-xs">
              Position and performance metrics
            </CardDescription>
          </div>
          <Badge
            className={
              trend === "up"
                ? "bg-green-100 text-green-700 border-green-200"
                : trend === "down"
                ? "bg-red-100 text-red-700 border-red-200"
                : "bg-gray-100 text-gray-700 border-gray-200"
            }>
            {trend === "up" && <TrendingUp className="h-3 w-3 mr-1" />}
            {trend === "down" && <TrendingDown className="h-3 w-3 mr-1" />}
            {trend === "same" && <Minus className="h-3 w-3 mr-1" />}
            {trend === "up"
              ? "Improving"
              : trend === "down"
              ? "Declining"
              : "Stable"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading ranking data...</p>
          </div>
        ) : !classPosition || !classTotal ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium mb-1">No ranking data available</p>
            <p className="text-xs px-4">
              Ranking will appear once assessments are recorded and calculated.
            </p>
          </div>
        ) : (
          <>
            {/* Main Ranking Display */}
            <div className="flex flex-col items-center justify-center py-4 border-b">
              {getRankIcon()}
              <div className="text-center mt-3">
                <p className="text-3xl font-bold text-primary">
                  {getOrdinal(classPosition)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  out of {classTotal} students
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs text-muted-foreground mb-1">
                  {bestSixCount ? `Best ${bestSixCount}` : "Best Six"}
                </p>
                <p className="text-xl font-bold">{bestSix}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {bestSixType === "points" ? "ECZ Points" : bestSixType === "standard_points" ? "Standard Grade" : "Total Score"}
                </p>
              </div>

              {overallAverage !== undefined && (
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-xs text-muted-foreground mb-1">
                    Overall Average
                  </p>
                  <p className="text-xl font-bold">{overallAverage}%</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    All Subjects
                  </p>
                </div>
              )}
            </div>

            {/* Subject Rankings */}
            {subjectRankings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  Subject Rankings
                </h4>
                <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                  {subjectRankings.map((subject, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-xs p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-medium truncate">{subject.subject}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {subject.score}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {subject.rank <= 3 && (
                          <Trophy
                            className={`h-3 w-3 ${
                              subject.rank === 1
                                ? "text-yellow-500"
                                : subject.rank === 2
                                ? "text-gray-400"
                                : "text-amber-600"
                            }`}
                          />
                        )}
                        <span className="text-muted-foreground font-mono">
                          {getOrdinal(subject.rank)}/{subject.total}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
