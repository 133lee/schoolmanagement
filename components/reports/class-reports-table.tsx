"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ReportCardData {
  id: string;
  student: {
    id: string;
    studentNumber: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    gender: string;
  };
  totalMarks: number | null;
  averageMark: number | null;
  position: number | null;
  outOf: number | null;
  attendance: number;
  daysPresent: number;
  daysAbsent: number;
  promotionStatus: string | null;
  subjects: {
    id: string;
    subject: {
      name: string;
      code: string;
    };
    catMark: number | null;
    midMark: number | null;
    eotMark: number | null;
    totalMark: number | null;
    grade: string | null;
    remarks: string | null;
  }[];
}

interface ClassReportsTableProps {
  reportCards: ReportCardData[];
}

// Helper function to get ECZ grade label
const getGradeLabel = (grade: string | null): string => {
  if (!grade) return "-";

  const gradeMap: Record<string, string> = {
    GRADE_1: "1",
    GRADE_2: "2",
    GRADE_3: "3",
    GRADE_4: "4",
    GRADE_5: "5",
    GRADE_6: "6",
    GRADE_7: "7",
    GRADE_8: "8",
    GRADE_9: "9",
  };

  return gradeMap[grade] || grade;
};

// Helper function to get grade variant
const getGradeVariant = (
  grade: string | null
): "default" | "secondary" | "destructive" => {
  if (!grade) return "secondary";

  if (grade === "GRADE_1" || grade === "GRADE_2") return "default"; // Distinction
  if (grade === "GRADE_9") return "destructive"; // Fail
  return "secondary";
};

// Helper function to get promotion status variant
const getPromotionVariant = (
  status: string | null
): "default" | "secondary" | "destructive" => {
  if (!status) return "secondary";
  if (status === "PROMOTED") return "default";
  if (status === "REPEAT") return "destructive";
  return "secondary";
};

// Helper function to format student name
const formatStudentName = (
  firstName: string,
  middleName: string | undefined,
  lastName: string
): string => {
  const parts = [firstName, middleName, lastName].filter(Boolean);
  return parts.join(" ");
};

// Helper function to get student initials
const getStudentInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export function ClassReportsTable({ reportCards }: ClassReportsTableProps) {
  // Sort report cards by position (if available)
  const sortedReportCards = [...reportCards].sort((a, b) => {
    if (a.position === null) return 1;
    if (b.position === null) return -1;
    return a.position - b.position;
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* ── Mobile compact list ────────────────────────────────────────────────── */}
      <div className="sm:hidden divide-y">
        {sortedReportCards.map((report, index) => {
          const fullName = formatStudentName(
            report.student.firstName,
            report.student.middleName,
            report.student.lastName
          );
          const initials = getStudentInitials(
            report.student.firstName,
            report.student.lastName
          );
          const totalDays = report.daysPresent + report.daysAbsent;
          const attendancePct =
            totalDays > 0 ? (report.daysPresent / totalDays) * 100 : 0;
          const attendanceColor =
            attendancePct >= 90
              ? "text-green-600"
              : attendancePct >= 75
              ? "text-amber-600"
              : "text-red-600";

          return (
            <div key={report.id} className="flex items-center gap-3 px-4 py-3">
              {/* Rank number */}
              <div className="w-5 shrink-0 text-center">
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
              </div>

              {/* Avatar */}
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-[11px] font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug truncate">
                  {fullName}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  <span>{report.student.studentNumber}</span>
                  {report.position !== null && (
                    <span>#{report.position}/{report.outOf}</span>
                  )}
                  <span className={attendanceColor}>
                    {attendancePct.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Average + status */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-sm font-bold tabular-nums">
                  {report.averageMark !== null
                    ? `${report.averageMark.toFixed(1)}%`
                    : "—"}
                </span>
                <Badge
                  variant={getPromotionVariant(report.promotionStatus)}
                  className="text-[10px] px-1.5 py-0 h-4">
                  {report.promotionStatus
                    ? report.promotionStatus.charAt(0) +
                      report.promotionStatus.slice(1).toLowerCase()
                    : "Pending"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ──────────────────────────────────────────────────────── */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No.</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="text-center">Average</TableHead>
              <TableHead className="text-center">Position</TableHead>
              <TableHead className="text-center">Attendance</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedReportCards.map((report, index) => {
              const fullName = formatStudentName(
                report.student.firstName,
                report.student.middleName,
                report.student.lastName
              );
              const initials = getStudentInitials(
                report.student.firstName,
                report.student.lastName
              );

              const attendancePercentage =
                report.daysPresent + report.daysAbsent > 0
                  ? (report.daysPresent /
                      (report.daysPresent + report.daysAbsent)) *
                    100
                  : 0;

              // Calculate average grade from subjects
              const subjectGrades = report.subjects
                .map((s) => s.grade)
                .filter((g) => g !== null);
              const averageGradeValue =
                subjectGrades.length > 0
                  ? subjectGrades.reduce((sum, grade) => {
                      const gradeNum = parseInt(
                        grade?.replace("GRADE_", "") || "9"
                      );
                      return sum + gradeNum;
                    }, 0) / subjectGrades.length
                  : null;

              let averageGrade = null;
              if (averageGradeValue !== null) {
                const roundedGrade = Math.round(averageGradeValue);
                averageGrade = `GRADE_${roundedGrade}`;
              }

              return (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {report.student.studentNumber}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold">
                        {report.averageMark !== null
                          ? `${report.averageMark.toFixed(1)}%`
                          : "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {report.position !== null && report.outOf !== null ? (
                      <span className="font-medium">
                        {report.position}/{report.outOf}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`font-medium ${
                          attendancePercentage >= 90
                            ? "text-green-600"
                            : attendancePercentage >= 75
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}>
                        {attendancePercentage.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {report.daysPresent}/
                        {report.daysPresent + report.daysAbsent}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {report.promotionStatus ? (
                      <Badge
                        variant={getPromotionVariant(report.promotionStatus)}>
                        {report.promotionStatus.charAt(0) +
                          report.promotionStatus.slice(1).toLowerCase()}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
