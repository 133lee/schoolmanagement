"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AttendanceData {
  date: string;
  boys: number;
  girls: number;
}

interface AttendanceTrendChartProps {
  classId: string;
  className: string;
}

const chartConfig = {
  attendance: {
    label: "Attendance",
  },
  boys: {
    label: "Boys",
    color: "oklch(0.6 0.2 250)", // Blue
  },
  girls: {
    label: "Girls",
    color: "oklch(0.7 0.15 350)", // Pink
  },
} satisfies ChartConfig;

export function AttendanceTrendChart({
  classId,
  className,
}: AttendanceTrendChartProps) {
  const [timeRange, setTimeRange] = React.useState("30d");
  const [chartData, setChartData] = React.useState<AttendanceData[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Fetch attendance data
  React.useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("auth_token");
        const response = await fetch(
          `/api/teacher/attendance/trends?classId=${classId}&timeRange=${timeRange}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || "Failed to load attendance data");
          }
          setChartData(result.data.attendanceData || []);
        } else {
          // Don't use mock data - show empty state
          setChartData([]);
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        // Don't use mock data - show empty state
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [classId, timeRange]);

  const filteredData = chartData;

  // Calculate summary statistics
  const totalDays = filteredData.length;
  const avgBoys =
    totalDays > 0
      ? Math.round(
          filteredData.reduce((sum, d) => sum + d.boys, 0) / totalDays
        )
      : 0;
  const avgGirls =
    totalDays > 0
      ? Math.round(
          filteredData.reduce((sum, d) => sum + d.girls, 0) / totalDays
        )
      : 0;
  const totalAvg = avgBoys + avgGirls;

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b py-3 px-4 lg:py-5 lg:px-6">
        <CardTitle className="text-sm lg:text-base font-semibold">Attendance Trends</CardTitle>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[110px] h-8 text-xs rounded-lg lg:w-[160px] lg:h-9 lg:text-sm shrink-0"
            aria-label="Select time range"
          >
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px]">
            <p className="text-sm text-muted-foreground">
              No attendance data available for this period
            </p>
          </div>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart data={filteredData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillBoys" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-boys)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-boys)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillGirls" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-girls)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-girls)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  width={32}
                  allowDecimals={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      }}
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="girls"
                  type="natural"
                  fill="url(#fillGirls)"
                  stroke="var(--color-girls)"
                  stackId="a"
                />
                <Area
                  dataKey="boys"
                  type="natural"
                  fill="url(#fillBoys)"
                  stroke="var(--color-boys)"
                  stackId="a"
                />
                <ChartLegend content={<ChartLegendContent payload={[]} />} />
              </AreaChart>
            </ChartContainer>

            {/* Summary Statistics */}
            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Avg. Boys</p>
                <p className="text-lg font-bold" style={{ color: "oklch(0.6 0.2 250)" }}>
                  {avgBoys}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Avg. Girls</p>
                <p className="text-lg font-bold" style={{ color: "oklch(0.7 0.15 350)" }}>
                  {avgGirls}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Avg.</p>
                <p className="text-lg font-bold">{totalAvg}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
