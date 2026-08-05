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

const chartConfig = {
  students: {
    label: "Students",
  },
  male: {
    label: "Male",
    color: "oklch(0.6 0.2 250)", // Blue
  },
  female: {
    label: "Female",
    color: "oklch(0.7 0.15 350)", // Pink
  },
} satisfies ChartConfig;

interface AttendanceDataPoint {
  date: string;
  male: number;
  female: number;
  malePresent: number;
  femalePresent: number;
  total: number;
  totalPresent: number;
  attendanceRate: number;
}

interface AttendanceChartProps {
  data: AttendanceDataPoint[];
  title?: string;
  description?: string;
}

export function AttendanceChartInteractive({
  data,
  title = "Attendance Trend",
  description = "Daily attendance by gender",
}: AttendanceChartProps) {
  const [timeRange, setTimeRange] = React.useState("30d");

  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const lastDate = new Date(data[data.length - 1].date);
    let daysToSubtract = 30;

    if (timeRange === "90d") {
      daysToSubtract = 90;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }

    const startDate = new Date(lastDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return data.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate;
    });
  }, [data, timeRange]);

  const stats = React.useMemo(() => {
    if (filteredData.length === 0) {
      return {
        avgMalePresent: 0,
        avgFemalePresent: 0,
        avgAttendanceRate: 0,
      };
    }

    const totalDays = filteredData.length;
    const avgMalePresent =
      filteredData.reduce((sum, day) => sum + day.malePresent, 0) / totalDays;
    const avgFemalePresent =
      filteredData.reduce((sum, day) => sum + day.femalePresent, 0) / totalDays;
    const avgAttendanceRate =
      filteredData.reduce((sum, day) => sum + day.attendanceRate, 0) / totalDays;

    return {
      avgMalePresent: Math.round(avgMalePresent),
      avgFemalePresent: Math.round(avgFemalePresent),
      avgAttendanceRate: parseFloat(avgAttendanceRate.toFixed(1)),
    };
  }, [filteredData]);

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description} - {stats.avgAttendanceRate}% average attendance
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
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
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            <p>No attendance data available for the selected period</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Avg Male Present</p>
                <p className="text-2xl font-bold">{stats.avgMalePresent}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Avg Female Present</p>
                <p className="text-2xl font-bold">{stats.avgFemalePresent}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Avg Attendance</p>
                <p className="text-2xl font-bold">{stats.avgAttendanceRate}%</p>
              </div>
            </div>

            {/* Chart */}
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart data={filteredData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="fillMale" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-male)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-male)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillFemale" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-female)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-female)"
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
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 11 }}
                  padding={{ left: 10, right: 10 }}
                  allowDataOverflow={false}
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
                      formatter={(value, name, item) => {
                        const present =
                          name === "male"
                            ? item.payload.malePresent
                            : item.payload.femalePresent;
                        return (
                          <span>
                            {present} present / {value} enrolled
                          </span>
                        );
                      }}
                    />
                  }
                />
                <Area
                  dataKey="femalePresent"
                  type="natural"
                  fill="url(#fillFemale)"
                  stroke="var(--color-female)"
                  stackId="a"
                  name="female"
                />
                <Area
                  dataKey="malePresent"
                  type="natural"
                  fill="url(#fillMale)"
                  stroke="var(--color-male)"
                  stackId="a"
                  name="male"
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
