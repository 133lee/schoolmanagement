"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SubjectScore {
  subject: string;
  score: number;
}

interface StudentPerformanceRadarProps {
  studentId: string;
  assessmentType: "CAT1" | "MID" | "EOT";
  data?: SubjectScore[];
  classPosition?: number | string;
  classTotal?: number;
  bestSix?: number | string | null;
  bestSixCount?: number | null;
  bestSixType?: "points" | "standard_points" | "percentage";
  trend?: "up" | "down" | "same";
  trendIsAbsolute?: boolean;
  loading?: boolean;
}

const chartConfig = {
  score: {
    label: "Score",
    color: "oklch(0.6 0.2 250)", // Blue
  },
} satisfies ChartConfig;

export function StudentPerformanceRadar({
  studentId,
  assessmentType,
  data,
  classPosition: propClassPosition,
  classTotal,
  bestSix: propBestSix,
  bestSixCount,
  bestSixType = "percentage",
  trend: propTrend,
  trendIsAbsolute = false,
  loading = false,
}: StudentPerformanceRadarProps) {
  const chartData = data || [];

  const trend = propTrend || "same";
  const classPosition =
    propClassPosition !== undefined
      ? classTotal
        ? `${propClassPosition}/${classTotal}`
        : propClassPosition
      : "N/A";

  // Format best six based on type (percentage vs points)
  const bestSix =
    propBestSix !== undefined && propBestSix !== null
      ? typeof propBestSix === "number"
        ? bestSixType === "points" || bestSixType === "standard_points"
          ? `${propBestSix} Points`
          : `${propBestSix}/600`
        : propBestSix
      : "N/A";

  const bestSixLabel =
    bestSixCount !== undefined && bestSixCount !== null
      ? `Best ${bestSixCount}`
      : "Best Six";

  const bestSixSuffix =
    bestSixType === "points"
      ? "(ECZ Points)"
      : bestSixType === "standard_points"
      ? "(Standard Grade)"
      : "(Total %)";

  return (
    <Card className="h-[450px] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Performance Radar</CardTitle>
            <CardDescription className="text-xs">
              Subject score distribution for {assessmentType}
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
              ? trendIsAbsolute ? "Good" : "Improving"
              : trend === "down"
              ? trendIsAbsolute ? "At Risk" : "Declining"
              : "Stable"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center min-h-0 py-4">
        {loading ? (
          <div className="text-center text-muted-foreground text-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
              <p>Loading performance data...</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm px-4">
            <p className="font-medium mb-1">No assessment results yet</p>
            <p className="text-xs">
              Performance data will appear once assessments are created and
              results are recorded.
            </p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-square max-h-[250px] w-full">
            <RadarChart data={chartData}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <PolarAngleAxis dataKey="subject" className="text-xs" />
              <PolarGrid />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
              <Radar
                dataKey="score"
                fill="var(--color-score)"
                fillOpacity={0.6}
                dot={{
                  r: 4,
                  fillOpacity: 1,
                }}
              />
            </RadarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="pt-2 pb-3 px-6 flex-shrink-0">
        <div className="flex items-center justify-between w-full gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              Class Position
            </span>
            <span className="text-sm font-semibold">{classPosition}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs text-muted-foreground">
              {bestSixLabel} {bestSixSuffix}
            </span>
            <span className="text-sm font-semibold">{bestSix}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
