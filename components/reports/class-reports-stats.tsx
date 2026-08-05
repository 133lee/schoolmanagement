"use client";

import { TrendingUp, Users, Award, CalendarCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/shared/stats-card"; // adjust path

interface StatsData {
  totalStudents: number;
  averageClassMark: number;
  passRate: number;
  distinctionRate: number;
  attendanceRate: number;
  isJuniorSecondary: boolean;
}

interface ClassReportsStatsProps {
  stats: StatsData;
  loading?: boolean;
}

const getVariant = (title: string) => {
  switch (title) {
    case "Total Students":
      return "info";
    case "Class Average":
      return "primary";
    case "Pass Rate":
      return "success";
    case "Distinction Rate":
    case "Quality Pass":
      return "warning";
    case "Attendance":
      return "primary";
    default:
      return "primary";
  }
};

export function ClassReportsStats({ stats, loading }: ClassReportsStatsProps) {
  // Determine distinction card label and subtitle based on grade level
  const distinctionLabel = stats.isJuniorSecondary ? "Quality Pass" : "Distinction Rate";
  const distinctionSubtitle = stats.isJuniorSecondary
    ? "Dist 1 (≥75%)"
    : "Grade 1-2 (≥70%)";

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      subtitle: "Students in class",
    },
    {
      label: "Class Average",
      value: `${stats.averageClassMark.toFixed(1)}%`,
      icon: TrendingUp,
      subtitle: "Average mark",
    },
    {
      label: "Pass Rate",
      value: `${stats.passRate.toFixed(1)}%`,
      icon: Award,
      subtitle: "Students passing (≥40%)",
    },
    {
      label: distinctionLabel,
      value: `${stats.distinctionRate.toFixed(1)}%`,
      icon: Award,
      subtitle: distinctionSubtitle,
    },
    {
      label: "Attendance",
      value: `${stats.attendanceRate.toFixed(1)}%`,
      icon: CalendarCheck,
      subtitle: "Average attendance",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
      {statCards.map((stat, index) =>
        loading ? (
          <Skeleton key={index} className="h-[104px] rounded-lg" />
        ) : (
          <StatsCard
            key={index}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            subtitle={stat.subtitle}
            variant={getVariant(stat.label)}
          />
        )
      )}
    </div>
  );
}
