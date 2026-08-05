"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Search,
  Download,
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
import { StatsCard } from "@/components/shared/stats-card";
import { pdf, Document, Page, View, Text, StyleSheet as PdfStyleSheet } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyContent,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

interface ClassData {
  id: string;
  name: string;
  gradeLevel?: string;
}

type AttendanceStatus = "P" | "A" | "L" | "E" | null;

interface Student {
  id: string;
  name: string;
  gender: "M" | "F";
  attendance: AttendanceStatus[];
}

interface AttendanceAPIResponse {
  students: Student[];
  month: number;
  year: number;
  daysInMonth: number;
}

interface DetailedAttendanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData: ClassData | null;
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// ─── PDF Document ────────────────────────────────────────────────────────────

const pdfStyles = PdfStyleSheet.create({
  page: { padding: 32, fontFamily: "Helvetica", backgroundColor: "#ffffff" },
  header: { marginBottom: 20 },
  title: { fontSize: 15, fontWeight: "bold", color: "#111827" },
  subtitle: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  summaryRow: { flexDirection: "row", marginBottom: 18, gap: 8 },
  summaryBox: { flex: 1, padding: 10, backgroundColor: "#f9fafb", borderRadius: 4, borderWidth: 1, borderColor: "#e5e7eb" },
  summaryLabel: { fontSize: 7.5, color: "#6b7280", marginBottom: 3, textTransform: "uppercase" },
  summaryValue: { fontSize: 15, fontWeight: "bold", color: "#111827" },
  summarySub: { fontSize: 7, color: "#9ca3af", marginTop: 2 },
  tableHead: { flexDirection: "row", backgroundColor: "#f3f4f6", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#d1d5db" },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", backgroundColor: "#f9fafb" },
  thNum: { width: 22, fontSize: 8, fontWeight: "bold", color: "#6b7280" },
  thName: { flex: 1, fontSize: 8, fontWeight: "bold", color: "#6b7280" },
  thStat: { width: 26, fontSize: 8, fontWeight: "bold", color: "#6b7280", textAlign: "center" },
  thRate: { width: 34, fontSize: 8, fontWeight: "bold", color: "#6b7280", textAlign: "center" },
  thStatus: { width: 46, fontSize: 8, fontWeight: "bold", color: "#6b7280", textAlign: "center" },
  tdNum: { width: 22, fontSize: 8, color: "#9ca3af" },
  tdName: { flex: 1, fontSize: 8, color: "#111827" },
  tdStat: { width: 26, fontSize: 8, textAlign: "center", color: "#374151" },
  tdRate: { width: 34, fontSize: 8.5, fontWeight: "bold", textAlign: "center", color: "#111827" },
  tdStatus: { width: 46, fontSize: 7.5, textAlign: "center" },
  badge: { paddingVertical: 1, paddingHorizontal: 4, borderRadius: 3 },
  badgeGood: { backgroundColor: "#dcfce7", color: "#15803d" },
  badgeFair: { backgroundColor: "#fef9c3", color: "#a16207" },
  badgeRisk: { backgroundColor: "#fee2e2", color: "#b91c1c" },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: "#9ca3af" },
});

interface RankingPDFProps {
  className: string;
  month: string;
  year: number;
  stats: { avgRate: number; atRisk: number; perfect: number; total: number };
  ranked: Array<{ id: string; name: string; present: number; absent: number; late: number; excused: number; percentage: string }>;
}

function AttendanceRankingPDF({ className, month, year, stats, ranked }: RankingPDFProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Attendance Ranking — {className}</Text>
          <Text style={pdfStyles.subtitle}>{month} {year} · Generated {new Date().toLocaleDateString()}</Text>
        </View>

        {/* Summary boxes */}
        <View style={pdfStyles.summaryRow}>
          <View style={pdfStyles.summaryBox}>
            <Text style={pdfStyles.summaryLabel}>Class Average</Text>
            <Text style={pdfStyles.summaryValue}>{stats.avgRate.toFixed(1)}%</Text>
            <Text style={pdfStyles.summarySub}>{stats.total} students</Text>
          </View>
          <View style={pdfStyles.summaryBox}>
            <Text style={pdfStyles.summaryLabel}>At Risk</Text>
            <Text style={pdfStyles.summaryValue}>{stats.atRisk}</Text>
            <Text style={pdfStyles.summarySub}>Below 75%</Text>
          </View>
          <View style={pdfStyles.summaryBox}>
            <Text style={pdfStyles.summaryLabel}>Perfect Attendance</Text>
            <Text style={pdfStyles.summaryValue}>{stats.perfect}</Text>
            <Text style={pdfStyles.summarySub}>100% rate</Text>
          </View>
          <View style={pdfStyles.summaryBox}>
            <Text style={pdfStyles.summaryLabel}>Concern Rate</Text>
            <Text style={pdfStyles.summaryValue}>
              {stats.total > 0 ? ((stats.atRisk / stats.total) * 100).toFixed(0) : 0}%
            </Text>
            <Text style={pdfStyles.summarySub}>of class at risk</Text>
          </View>
        </View>

        {/* Table header */}
        <View style={pdfStyles.tableHead}>
          <Text style={pdfStyles.thNum}>#</Text>
          <Text style={pdfStyles.thName}>Student</Text>
          <Text style={pdfStyles.thStat}>P</Text>
          <Text style={pdfStyles.thStat}>A</Text>
          <Text style={pdfStyles.thStat}>L</Text>
          <Text style={pdfStyles.thStat}>E</Text>
          <Text style={pdfStyles.thRate}>Rate</Text>
          <Text style={pdfStyles.thStatus}>Status</Text>
        </View>

        {/* Table rows */}
        {ranked.map((student, idx) => {
          const rate = parseFloat(student.percentage);
          const status = rate >= 90 ? "Good" : rate >= 75 ? "Fair" : "At Risk";
          const badgeStyle = status === "Good" ? pdfStyles.badgeGood : status === "Fair" ? pdfStyles.badgeFair : pdfStyles.badgeRisk;
          const rowStyle = idx % 2 === 1 ? pdfStyles.tableRowAlt : pdfStyles.tableRow;
          return (
            <View key={student.id} style={rowStyle}>
              <Text style={pdfStyles.tdNum}>{idx + 1}</Text>
              <Text style={pdfStyles.tdName}>{student.name}</Text>
              <Text style={pdfStyles.tdStat}>{student.present}</Text>
              <Text style={pdfStyles.tdStat}>{student.absent}</Text>
              <Text style={pdfStyles.tdStat}>{student.late}</Text>
              <Text style={pdfStyles.tdStat}>{student.excused}</Text>
              <Text style={pdfStyles.tdRate}>{student.percentage}%</Text>
              <View style={[pdfStyles.tdStatus, { alignItems: "center" }]}>
                <View style={[pdfStyles.badge, badgeStyle]}>
                  <Text style={{ fontSize: 7, fontWeight: "bold", color: badgeStyle.color }}>{status}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>{className} · Attendance Ranking · {month} {year}</Text>
          <Text style={pdfStyles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function DetailedAttendanceSheet({
  open,
  onOpenChange,
  classData,
}: DetailedAttendanceSheetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"attendance" | "statistics">(
    "attendance"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [genderOpen, setGenderOpen] = useState(true);
  const [rankingOpen, setRankingOpen] = useState(true);
  const [showAllRanked, setShowAllRanked] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [daysInMonth, setDaysInMonth] = useState(
    getDaysInMonth(currentMonth, currentYear)
  );
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Fetch attendance data from API
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!classData) {
        setStudents([]);
        return;
      }

      try {
        setLoading(true);
        setShowAllRanked(false);
        const token = localStorage.getItem("auth_token");
        const response = await fetch(
          `/api/teacher/classes/${classData.id}/attendance?month=${currentMonth}&year=${currentYear}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const result = await response.json();

          // API returns { success: true, data: {...} } - must check success flag
          if (!result.success) {
            console.error("API returned success=false:", result.error);
            setStudents([]);
            return;
          }

          const data: AttendanceAPIResponse = result.data;
          setStudents(data.students ?? []);
          setDaysInMonth(data.daysInMonth);
        } else {
          console.error("Failed to fetch attendance data");
          setStudents([]);
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [classData, currentMonth, currentYear]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentDate(date);
      setCalendarOpen(false);
    }
  };

  const calculateStats = (student: Student) => {
    const markedDays = student.attendance.filter((a) => a !== null);
    const present = student.attendance.filter((a) => a === "P").length;
    const late = student.attendance.filter((a) => a === "L").length;
    const excused = student.attendance.filter((a) => a === "E").length;
    const absent = student.attendance.filter((a) => a === "A").length;
    const total = markedDays.length;
    // Count Present and Late as attended
    const attended = present + late;
    const percentage = total > 0 ? ((attended / total) * 100).toFixed(1) : "0";
    return { present, late, excused, absent, attended, percentage, total };
  };

  const classStats = useMemo(() => {
    if (!students || students.length === 0) return null;

    const allStats = students.map((s) => ({ ...calculateStats(s), gender: s.gender, name: s.name, id: s.id }));
    const rates = allStats.map((s) => parseFloat(s.percentage));

    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const atRisk = allStats.filter((s) => parseFloat(s.percentage) < 75).length;
    const perfect = allStats.filter((s) => parseFloat(s.percentage) === 100).length;

    const males = allStats.filter((s) => s.gender === "M");
    const females = allStats.filter((s) => s.gender === "F");
    const maleAvg = males.length > 0
      ? males.reduce((a, s) => a + parseFloat(s.percentage), 0) / males.length
      : null;
    const femaleAvg = females.length > 0
      ? females.reduce((a, s) => a + parseFloat(s.percentage), 0) / females.length
      : null;

    const ranked = [...allStats].sort((a, b) => parseFloat(a.percentage) - parseFloat(b.percentage));

    return { avgRate, atRisk, perfect, total: students.length, males: males.length, females: females.length, maleAvg, femaleAvg, ranked };
  }, [students]);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!searchQuery.trim()) return students;
    return students.filter((student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const handleExportAttendance = () => {
    if (!classData) return;

    // Create CSV content
    const csvRows = [];

    // Header row
    const headers = [
      "Student Name",
      ...days.map((d) => `Day ${d}`),
      "Present",
      "Late",
      "Excused",
      "Absent",
      "Attended",
      "Total",
      "Rate",
    ];
    csvRows.push(headers.join(","));

    // Student rows
    filteredStudents.forEach((student) => {
      const stats = calculateStats(student);
      const attendanceMarks = student.attendance.map((att) => att || "-");
      const row = [
        `"${student.name}"`,
        ...attendanceMarks,
        stats.present,
        stats.late,
        stats.excused,
        stats.absent,
        stats.attended,
        stats.total,
        `${stats.percentage}%`,
      ];
      csvRows.push(row.join(","));
    });

    // Create blob and download
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${classData.name}_Attendance_${months[currentMonth]}_${currentYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadRankingPDF = async () => {
    if (!classStats || !classData) return;
    try {
      setPdfLoading(true);
      const blob = await pdf(
        <AttendanceRankingPDF
          className={classData.name}
          month={months[currentMonth]}
          year={currentYear}
          stats={{ avgRate: classStats.avgRate, atRisk: classStats.atRisk, perfect: classStats.perfect, total: classStats.total }}
          ranked={classStats.ranked}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${classData.name}_Ranking_${months[currentMonth]}_${currentYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  };

  if (!classData) return null;

  // Reusable legend items
  const legendItems = [
    { s: "P", label: "Present",    bg: "bg-green-100  dark:bg-green-900/40",  text: "text-green-700  dark:text-green-300"  },
    { s: "L", label: "Late",       bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-300" },
    { s: "E", label: "Excused",    bg: "bg-blue-100   dark:bg-blue-900/40",   text: "text-blue-700   dark:text-blue-300"   },
    { s: "A", label: "Absent",     bg: "bg-red-100    dark:bg-red-900/40",    text: "text-red-700    dark:text-red-300"    },
    { s: "–", label: "Not marked", bg: "bg-muted",                            text: "text-muted-foreground"                },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[95vw] lg:max-w-[85vw] p-0 flex flex-col duration-500 data-[state=closed]:duration-300">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "attendance" | "statistics")}
          className="flex flex-col h-full">

          {/* ── Header ─────────────────────────────────────────────────────────── */}
          <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0 sm:px-6 sm:pt-5 sm:pb-4">
            {/* Mobile: title then tabs on next row */}
            <div className="sm:hidden">
              <SheetTitle className="text-base flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 shrink-0" />
                {classData.name}
              </SheetTitle>
              <TabsList className="grid grid-cols-2 mt-3 w-full">
                <TabsTrigger value="attendance">Attendance Grid</TabsTrigger>
                <TabsTrigger value="statistics">Statistics</TabsTrigger>
              </TabsList>
            </div>
            {/* Desktop: title + tabs side by side */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex-1">
                <SheetTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Detailed Attendance — {classData.name}
                </SheetTitle>
                <SheetDescription>
                  {classData.gradeLevel && `${classData.gradeLevel} · `}Monthly attendance records
                </SheetDescription>
              </div>
              <TabsList className="grid grid-cols-2 mr-5">
                <TabsTrigger value="attendance">Attendance Grid</TabsTrigger>
                <TabsTrigger value="statistics">Statistics</TabsTrigger>
              </TabsList>
            </div>
          </SheetHeader>

          {/* ── Body ───────────────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden px-4 py-3 flex flex-col min-h-0 sm:px-6 sm:py-4">

            {/* ── Attendance Grid Tab ──────────────────────────────────────────── */}
            <TabsContent value="attendance" className="flex-1 mt-0 sm:mt-4 min-h-0 overflow-hidden flex flex-col gap-3">

              {/* Mobile controls */}
              <div className="sm:hidden space-y-2 shrink-0">
                {/* Row 1: nav + search */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-center font-semibold h-9 text-sm min-w-0">
                        <CalendarIcon className="h-4 w-4 mr-1.5 shrink-0" />
                        <span className="truncate">{months[currentMonth]} {currentYear}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar mode="single" selected={currentDate} onSelect={handleDateSelect} month={currentDate} onMonthChange={setCurrentDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                </div>
                {/* Row 2: compact legend pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {legendItems.map((item) => (
                    <div key={item.s} className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${item.bg} ${item.text}`}>
                      <span className="font-bold">{item.s}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop controls */}
              <div className="hidden sm:flex items-center justify-between mb-1 px-2 shrink-0">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="min-w-[180px] justify-center font-semibold">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {months[currentMonth]} {currentYear}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                      <Calendar mode="single" selected={currentDate} onSelect={handleDateSelect} month={currentDate} onMonthChange={setCurrentDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <Button variant="outline" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="relative w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search student by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {legendItems.map((item) => (
                    <div key={item.s} className="flex items-center gap-2">
                      <div className={`w-6 h-6 ${item.bg} border rounded flex items-center justify-center`}>
                        <span className={`text-xs font-semibold ${item.text}`}>{item.s}</span>
                      </div>
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance grid — fills remaining height */}
              <Card className="overflow-hidden flex flex-col flex-1 min-h-0">
                {loading ? (
                  <Empty className="h-full">
                    <EmptyContent>
                      <EmptyMedia><CalendarIcon className="h-6 w-6" /></EmptyMedia>
                      <EmptyHeader>
                        <EmptyTitle>Loading attendance data</EmptyTitle>
                        <EmptyDescription>Please wait while we fetch the records…</EmptyDescription>
                      </EmptyHeader>
                    </EmptyContent>
                  </Empty>
                ) : !students?.length ? (
                  <Empty className="h-full">
                    <EmptyContent>
                      <EmptyMedia><CalendarIcon className="h-6 w-6" /></EmptyMedia>
                      <EmptyHeader>
                        <EmptyTitle>No students found</EmptyTitle>
                        <EmptyDescription>No students enrolled for the selected period.</EmptyDescription>
                      </EmptyHeader>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <div className="overflow-auto h-full">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-muted/50 backdrop-blur-sm">
                        <TableRow>
                          <TableHead className="sticky left-0 z-30 bg-muted/90 backdrop-blur-sm p-3 text-left font-semibold text-sm border-r border-b min-w-[160px] sm:min-w-[200px]">
                            Student
                          </TableHead>
                          {days.map((day) => (
                            <TableHead key={day} className="p-1 text-center font-medium text-sm border-b min-w-[36px] sm:min-w-[48px] text-muted-foreground">
                              {day}
                            </TableHead>
                          ))}
                          <TableHead className="sticky right-0 z-30 bg-muted/90 backdrop-blur-sm p-3 text-center font-semibold text-sm border-l border-b min-w-[72px] sm:min-w-[100px]">
                            Rate
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student, studentIdx) => {
                          const stats = calculateStats(student);
                          return (
                            <TableRow
                              key={student.id}
                              className={`border-b hover:bg-muted/30 transition-colors ${studentIdx % 2 === 0 ? "bg-background" : "bg-muted/10"}`}>
                              <TableCell className="sticky left-0 z-10 bg-inherit backdrop-blur-sm p-2 sm:p-3 font-medium border-r">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
                                    <AvatarFallback className="text-xs">
                                      {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs sm:text-sm whitespace-nowrap">{student.name}</span>
                                </div>
                              </TableCell>
                              {days.map((day, dayIndex) => {
                                const status = student.attendance[dayIndex];
                                const cellStyle =
                                  status === null  ? { bg: "bg-background", text: "text-muted-foreground" }
                                  : status === "P" ? { bg: "bg-green-100 dark:bg-green-900/40",  text: "text-green-700 dark:text-green-300"  }
                                  : status === "L" ? { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-300" }
                                  : status === "E" ? { bg: "bg-blue-100 dark:bg-blue-900/40",    text: "text-blue-700 dark:text-blue-300"   }
                                  :                  { bg: "bg-red-100 dark:bg-red-900/40",      text: "text-red-700 dark:text-red-300"     };
                                return (
                                  <TableCell key={day} className={`p-0.5 sm:p-1 text-center border ${cellStyle.bg}`}>
                                    <div className="h-7 w-7 sm:h-10 sm:w-10 rounded-md flex items-center justify-center mx-auto">
                                      <span className={`text-xs font-semibold ${cellStyle.text}`}>{status || "–"}</span>
                                    </div>
                                  </TableCell>
                                );
                              })}
                              <TableCell className="sticky right-0 z-10 bg-inherit backdrop-blur-sm p-2 sm:p-3 text-center border-l">
                                <div className="flex flex-col items-center">
                                  <span className="font-semibold text-xs sm:text-sm">{stats.percentage}%</span>
                                  <span className="text-xs text-muted-foreground hidden sm:block">{stats.attended}/{stats.total}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>

              {/* Export */}
              {!loading && students && students.length > 0 && (
                <div className="flex justify-center shrink-0">
                  <Button variant="outline" size="sm" onClick={handleExportAttendance}>
                    <Download className="h-4 w-4 mr-2" />
                    Export to CSV
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ── Statistics Tab ───────────────────────────────────────────────── */}
            <TabsContent value="statistics" className="flex-1 mt-0 sm:mt-4 min-h-0 overflow-y-auto space-y-4 pb-6">
              {loading ? (
                <Empty className="h-80">
                  <EmptyContent>
                    <EmptyMedia><CalendarIcon className="h-6 w-6" /></EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>Loading statistics</EmptyTitle>
                      <EmptyDescription>Fetching attendance data…</EmptyDescription>
                    </EmptyHeader>
                  </EmptyContent>
                </Empty>
              ) : !classStats ? (
                <Empty className="h-80">
                  <EmptyContent>
                    <EmptyMedia><CalendarIcon className="h-6 w-6" /></EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>No data for {months[currentMonth]} {currentYear}</EmptyTitle>
                      <EmptyDescription>Record attendance first to see statistics here.</EmptyDescription>
                    </EmptyHeader>
                  </EmptyContent>
                </Empty>
              ) : (
                <>
                  {/* Period + month nav */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{months[currentMonth]} {currentYear}</span>
                      <span className="text-xs text-muted-foreground">· {classStats.total} students</span>
                    </div>
                    {/* Month nav on statistics tab too */}
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Summary stats — 2-col on mobile, 4-col on sm+ */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatsCard label="Class Average" value={`${classStats.avgRate.toFixed(1)}%`} icon={Users}        variant="primary" subtitle={`${classStats.total} enrolled`} />
                    <StatsCard label="At Risk"        value={classStats.atRisk}                   icon={AlertTriangle} variant="warning" subtitle="Below 75%"                    />
                    <StatsCard label="Perfect"        value={classStats.perfect}                  icon={CheckCircle2}  variant="success" subtitle="100% rate"                    />
                    <StatsCard
                      label="Concern Rate"
                      value={`${classStats.total > 0 ? ((classStats.atRisk / classStats.total) * 100).toFixed(0) : 0}%`}
                      icon={TrendingDown}
                      variant="danger"
                      subtitle="of class at risk"
                    />
                  </div>

                  {/* Gender Breakdown */}
                  {(classStats.maleAvg !== null || classStats.femaleAvg !== null) && (
                    <Card>
                      <CardHeader className="cursor-pointer select-none py-3 px-4" onClick={() => setGenderOpen(!genderOpen)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-sm">Gender Breakdown</CardTitle>
                            <CardDescription className="text-xs mt-0.5">Attendance rate by gender</CardDescription>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${genderOpen ? "rotate-180" : ""}`} />
                        </div>
                      </CardHeader>
                      {genderOpen && (
                        <CardContent className="px-4 pb-4 pt-0">
                          <div className="flex items-stretch gap-4">
                            {[
                              { label: "Male",   avg: classStats.maleAvg,   count: classStats.males,   color: "bg-blue-500" },
                              { label: "Female", avg: classStats.femaleAvg, count: classStats.females, color: "bg-pink-500" },
                            ].map((g, i) => (
                              <React.Fragment key={g.label}>
                                {i > 0 && <div className="w-px bg-border shrink-0" />}
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{g.label}</span>
                                    <span className="text-base font-bold tabular-nums">
                                      {g.avg !== null ? g.avg.toFixed(1) : "—"}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-1.5">
                                    <div className={`${g.color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${g.avg ?? 0}%` }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground">{g.count} student{g.count !== 1 ? "s" : ""}</span>
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )}

                  {/* Student Ranking */}
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="cursor-pointer select-none flex-1" onClick={() => setRankingOpen(!rankingOpen)}>
                          <CardTitle className="text-sm">Student Attendance Ranking</CardTitle>
                          <CardDescription className="text-xs mt-0.5">Lowest attendance first · {classStats.ranked.length} students</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={pdfLoading} onClick={handleDownloadRankingPDF}>
                            <Download className="h-3 w-3" />
                            {pdfLoading ? "Generating…" : "PDF"}
                          </Button>
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 cursor-pointer ${rankingOpen ? "rotate-180" : ""}`}
                            onClick={() => setRankingOpen(!rankingOpen)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    {rankingOpen && (
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="pl-3 sm:pl-4 w-8 text-xs">#</TableHead>
                              <TableHead className="text-xs">Student</TableHead>
                              <TableHead className="text-center w-8 text-xs text-green-600  dark:text-green-400">P</TableHead>
                              <TableHead className="text-center w-8 text-xs text-red-600    dark:text-red-400">A</TableHead>
                              <TableHead className="text-center w-8 text-xs text-yellow-600 dark:text-yellow-400">L</TableHead>
                              <TableHead className="text-center w-8 text-xs text-blue-600   dark:text-blue-400">E</TableHead>
                              <TableHead className="text-center w-14 text-xs">Rate</TableHead>
                              <TableHead className="text-center pr-3 sm:pr-4 w-16 text-xs">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(showAllRanked ? classStats.ranked : classStats.ranked.slice(0, 15)).map((student, idx) => {
                              const rate = parseFloat(student.percentage);
                              const status = rate >= 90 ? "Good" : rate >= 75 ? "Fair" : "At Risk";
                              const statusColor =
                                status === "Good"     ? "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400"
                                : status === "Fair"   ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                :                       "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400";
                              return (
                                <TableRow key={student.id} className={idx % 2 === 1 ? "bg-muted/30" : undefined}>
                                  <TableCell className="pl-3 sm:pl-4 py-2 text-xs text-muted-foreground font-medium">{idx + 1}</TableCell>
                                  <TableCell className="py-2">
                                    <div className="flex items-center gap-1.5">
                                      <Avatar className="h-6 w-6 shrink-0">
                                        <AvatarFallback className="text-[10px]">{student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs font-medium leading-tight truncate max-w-[90px] sm:max-w-none">{student.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2 text-center text-xs font-semibold text-green-600  dark:text-green-400">{student.present}</TableCell>
                                  <TableCell className="py-2 text-center text-xs font-semibold text-red-600    dark:text-red-400">{student.absent}</TableCell>
                                  <TableCell className="py-2 text-center text-xs font-semibold text-yellow-600 dark:text-yellow-400">{student.late}</TableCell>
                                  <TableCell className="py-2 text-center text-xs font-semibold text-blue-600   dark:text-blue-400">{student.excused}</TableCell>
                                  <TableCell className="py-2 text-center">
                                    <span className="text-xs font-bold tabular-nums">{student.percentage}%</span>
                                  </TableCell>
                                  <TableCell className="py-2 text-center pr-3 sm:pr-4">
                                    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>{status}</span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        {/* Show all / show fewer toggle */}
                        {classStats.ranked.length > 15 && (
                          <button
                            onClick={() => setShowAllRanked((v) => !v)}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                          >
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showAllRanked ? "rotate-180" : ""}`} />
                            {showAllRanked
                              ? "Show fewer"
                              : `Show all ${classStats.ranked.length} students`}
                          </button>
                        )}
                      </CardContent>
                    )}
                  </Card>
                </>
              )}
            </TabsContent>

          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
