"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  Users,
  TrendingUp,
  RefreshCw,
  Download,
  CalendarDays,
} from "lucide-react";
import {
  downloadAttendanceReportPdf,
  downloadDailyAttendanceReportPdf,
} from "@/lib/pdf/attendance-report-pdf";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendanceChartInteractive } from "@/components/admin/attendance-chart-interactive";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { StatsCard } from "@/components/shared/stats-card";
import { api } from "@/lib/api-client";

interface GradeOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
}

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

interface ClassBreakdown {
  className: string;
  gradeName?: string;
  totalStudents: number;
  maleCount: number;
  femaleCount: number;
  malePresent: number;
  femalePresent: number;
  maleAbsent: number;
  femaleAbsent: number;
  totalPresent: number;
  totalAbsent: number;
  attendanceRate: number;
}

export default function AdminAttendanceAnalyticsPage() {
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [showClassBreakdown, setShowClassBreakdown] = useState(false);
  const [viewMode, setViewMode] = useState<"grade" | "class">("grade");

  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceDataPoint[]>(
    []
  );
  const [classBreakdown, setClassBreakdown] = useState<ClassBreakdown[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDailyPdf, setDownloadingDailyPdf] = useState(false);
  const [dailyReportDate, setDailyReportDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [dailyReportWholeSchool, setDailyReportWholeSchool] = useState(false);

  // Calculate date range (last 90 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  // Fetch initial data
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(true);
        setError(null);

        console.log("[Attendance Analytics] Fetching initial data (grades)");

        // Fetch all grades
        const gradesData = await api.get("/grade-levels");
        console.log("[Attendance Analytics] Grades API response:", gradesData);

        const grades = gradesData.data || gradesData;
        if (Array.isArray(grades)) {
          const gradeOptions: GradeOption[] = grades.map((g: any) => ({
            id: g.id,
            name: g.name,
          }));
          console.log("[Attendance Analytics] Loaded grades:", gradeOptions);
          setGrades(gradeOptions);
        } else {
          console.warn(
            "[Attendance Analytics] Grades data is not an array:",
            grades
          );
        }

        setLoading(false);
      } catch (err: any) {
        console.error(
          "[Attendance Analytics] Error fetching initial data:",
          err
        );
        setError(err.message || "Failed to load initial data");
        setLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  // Fetch classes when grade changes
  useEffect(() => {
    async function fetchClasses() {
      if (!selectedGrade) {
        console.log(
          "[Attendance Analytics] No grade selected, clearing classes"
        );
        setClasses([]);
        return;
      }

      try {
        console.log(
          "[Attendance Analytics] Fetching classes for grade:",
          selectedGrade
        );
        const classesData = await api.get(`/classes?gradeId=${selectedGrade}`);
        console.log(
          "[Attendance Analytics] Classes API response:",
          classesData
        );

        const classesArray =
          classesData.data?.data || classesData.data || classesData;
        if (Array.isArray(classesArray)) {
          const classOptions: ClassOption[] = classesArray.map((c: any) => ({
            id: c.id,
            name: c.name,
          }));
          console.log("[Attendance Analytics] Loaded classes:", classOptions);
          setClasses(classOptions);
        } else {
          console.warn(
            "[Attendance Analytics] Classes data is not an array:",
            classesArray
          );
        }
      } catch (err: any) {
        console.error("[Attendance Analytics] Error fetching classes:", err);
      }
    }

    fetchClasses();
  }, [selectedGrade]);

  // Fetch attendance data function (extracted for manual refresh)
  const fetchAttendanceData = async () => {
    if (viewMode === "grade" && !selectedGrade) {
      console.log(
        "[Attendance Analytics] No grade selected in grade view mode"
      );
      setAttendanceData([]);
      setClassBreakdown([]);
      setSummary(null);
      return;
    }

    if (viewMode === "class" && !selectedClass) {
      console.log(
        "[Attendance Analytics] No class selected in class view mode"
      );
      setAttendanceData([]);
      setClassBreakdown([]);
      setSummary(null);
      return;
    }

    try {
      setDataLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (viewMode === "grade" && selectedGrade) {
        params.append("gradeId", selectedGrade);
        if (showClassBreakdown) {
          params.append("includeClassBreakdown", "true");
        }
      } else if (viewMode === "class" && selectedClass) {
        params.append("classId", selectedClass);
      }

      const url = `/admin/attendance/analytics?${params.toString()}`;
      console.log("[Attendance Analytics] Fetching data from:", url);
      console.log("[Attendance Analytics] View mode:", viewMode);
      console.log("[Attendance Analytics] Selected grade:", selectedGrade);
      console.log("[Attendance Analytics] Selected class:", selectedClass);

      const response = await api.get(url);

      console.log("[Attendance Analytics] Raw API response:", response);

      // API client wraps response in { data: {...}, meta: {...} }
      const data = response.data || response;
      console.log("[Attendance Analytics] Unwrapped data:", data);

      if (data.trend) {
        console.log("[Attendance Analytics] Found trend data:", {
          dailyDataPoints: data.trend.dailyData?.length || 0,
          summary: data.trend.summary,
        });
        setAttendanceData(data.trend.dailyData || []);
        setSummary(data.trend.summary || null);
      } else {
        console.warn("[Attendance Analytics] No trend data in response");
        setAttendanceData([]);
        setSummary(null);
      }

      if (data.classBreakdown) {
        console.log(
          "[Attendance Analytics] Found class breakdown:",
          data.classBreakdown.length,
          "classes"
        );
        setClassBreakdown(data.classBreakdown || []);
      } else {
        console.log("[Attendance Analytics] No class breakdown in response");
        setClassBreakdown([]);
      }

      setDataLoading(false);
    } catch (err: any) {
      console.error(
        "[Attendance Analytics] Error fetching attendance data:",
        err
      );
      console.error("[Attendance Analytics] Error details:", {
        message: err.message,
        response: err.response,
        status: err.status,
      });
      setError(err.message || "Failed to load attendance data");
      setDataLoading(false);
    }
  };

  // Fetch attendance data when filters change
  useEffect(() => {
    fetchAttendanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, selectedClass, viewMode, showClassBreakdown]);

  const scopeLabel =
    viewMode === "grade"
      ? grades.find((g) => g.id === selectedGrade)?.name || "Grade"
      : classes.find((c) => c.id === selectedClass)?.name || "Class";

  const fetchSchoolBranding = async (): Promise<{
    schoolName?: string;
    schoolLogoBase64?: string;
  }> => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/settings/school-info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const info = json.data || json;
        return {
          schoolName: info.settings?.name || undefined,
          schoolLogoBase64: info.logoBase64 || undefined,
        };
      }
    } catch { /* non-fatal */ }
    return {};
  };

  const handleDownloadPdf = async () => {
    if (!summary || attendanceData.length === 0) return;
    setDownloadingPdf(true);
    try {
      const { schoolName, schoolLogoBase64 } = await fetchSchoolBranding();

      await downloadAttendanceReportPdf(
        {
          scopeLabel,
          summary: {
            totalStudents: summary.totalStudents,
            maleStudents: summary.maleStudents,
            femaleStudents: summary.femaleStudents,
            averageAttendanceRate: summary.averageAttendanceRate,
          },
          dailyData: attendanceData.map((d) => ({
            date: d.date,
            male: d.male,
            female: d.female,
            total: d.total,
            totalPresent: d.totalPresent,
            attendanceRate: d.attendanceRate,
          })),
          classBreakdown:
            showClassBreakdown && classBreakdown.length > 0
              ? classBreakdown.map((c) => ({
                  className: c.className,
                  totalStudents: c.totalStudents,
                  maleCount: c.maleCount,
                  femaleCount: c.femaleCount,
                  totalPresent: c.totalPresent,
                  totalAbsent: c.totalAbsent,
                  attendanceRate: c.attendanceRate,
                }))
              : undefined,
        },
        { startDate, endDate, schoolName, schoolLogoBase64 }
      );
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadDailyPdf = async () => {
    const hasScope =
      dailyReportWholeSchool ||
      (viewMode === "grade" ? !!selectedGrade : !!selectedClass);
    if (!hasScope || !dailyReportDate) return;
    setDownloadingDailyPdf(true);
    try {
      const day = new Date(`${dailyReportDate}T00:00:00`);
      const dayEnd = new Date(`${dailyReportDate}T23:59:59`);
      const params = new URLSearchParams({
        startDate: day.toISOString(),
        endDate: dayEnd.toISOString(),
      });
      if (dailyReportWholeSchool) {
        params.append("includeClassBreakdown", "true");
      } else if (viewMode === "grade" && selectedGrade) {
        params.append("gradeId", selectedGrade);
        params.append("includeClassBreakdown", "true");
      } else if (viewMode === "class" && selectedClass) {
        params.append("classId", selectedClass);
      }

      const response = await api.get(
        `/admin/attendance/analytics?${params.toString()}`
      );
      const resData = response.data || response;

      let classRows: Array<{
        className: string;
        gradeName?: string;
        totalStudents: number;
        maleCount: number;
        femaleCount: number;
        totalPresent: number;
        totalAbsent: number;
        attendanceRate: number;
      }>;

      if ((dailyReportWholeSchool || viewMode === "grade") && resData.classBreakdown) {
        classRows = (resData.classBreakdown as ClassBreakdown[]).map((row) => ({
          className: row.className,
          gradeName: row.gradeName,
          totalStudents: row.totalStudents,
          maleCount: row.maleCount,
          femaleCount: row.femaleCount,
          totalPresent: row.totalPresent,
          totalAbsent: row.totalAbsent,
          attendanceRate: row.attendanceRate,
        }));
      } else {
        const day0 = resData.trend?.dailyData?.[0];
        const className =
          classes.find((cls) => cls.id === selectedClass)?.name || scopeLabel;
        classRows = day0
          ? [
              {
                className,
                totalStudents: day0.total,
                maleCount: day0.male,
                femaleCount: day0.female,
                totalPresent: day0.totalPresent,
                totalAbsent: day0.totalAbsent ?? day0.total - day0.totalPresent,
                attendanceRate: day0.attendanceRate,
              },
            ]
          : [];
      }

      const { schoolName, schoolLogoBase64 } = await fetchSchoolBranding();
      const reportScopeLabel = dailyReportWholeSchool ? "All Grades" : scopeLabel;

      await downloadDailyAttendanceReportPdf(
        {
          scopeLabel: reportScopeLabel,
          date: day,
          classRows,
          showGradeColumn: dailyReportWholeSchool,
        },
        { schoolName, schoolLogoBase64 }
      );
    } finally {
      setDownloadingDailyPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-1">
          <h1 className="text-xl font-bold">Attendance Analytics</h1>
          <p className="text-muted-foreground text-sm">
            View attendance trends and patterns by grade or class
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={dailyReportDate}
                onChange={(e) => setDailyReportDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="h-9 rounded-md border border-input bg-background pl-7 pr-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 h-9">
              <input
                type="checkbox"
                id="daily-whole-school"
                checked={dailyReportWholeSchool}
                onChange={(e) => setDailyReportWholeSchool(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              <Label htmlFor="daily-whole-school" className="text-sm whitespace-nowrap">
                Whole school
              </Label>
            </div>
            <Button
              onClick={handleDownloadDailyPdf}
              variant="outline"
              size="sm"
              disabled={
                downloadingDailyPdf ||
                (!dailyReportWholeSchool &&
                  (viewMode === "grade" ? !selectedGrade : !selectedClass))
              }>
              {downloadingDailyPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Daily Report
            </Button>
          </div>
          <Button
            onClick={handleDownloadPdf}
            variant="outline"
            size="sm"
            disabled={downloadingPdf || !summary || attendanceData.length === 0}>
            {downloadingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Trend PDF (90d)
          </Button>
          <Button
            onClick={fetchAttendanceData}
            variant="outline"
            size="sm"
            disabled={dataLoading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${dataLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Skeleton className="h-9 w-36" /><Skeleton className="h-9 w-36" /><Skeleton className="h-9 w-28" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0,1,2,3].map(i => <Card key={i}><CardContent className="pt-5 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-16" /></CardContent></Card>)}
          </div>
          <Card><CardContent className="pt-5 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => {
              const ws = ["w-32","w-28","w-36","w-24","w-32","w-28","w-36","w-24"];
              return (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className={`h-4 ${ws[i]}`} />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              );
            })}
          </CardContent></Card>
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <div className="space-y-6">
          {/* Filters Card */}
          <Card>
            <CardContent className="py-0s">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* View Mode Selection */}
                <div className="flex items-center space-x-4 shrink-0">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="grade-view"
                      name="viewMode"
                      checked={viewMode === "grade"}
                      onChange={() => setViewMode("grade")}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="grade-view" className="text-sm">
                      Grade-Level View
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="class-view"
                      name="viewMode"
                      checked={viewMode === "class"}
                      onChange={() => setViewMode("class")}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="class-view" className="text-sm">
                      Individual Class View
                    </Label>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-1 items-center gap-3">
                  {/* Grade Selector */}
                  <div className="flex items-center gap-2 min-w-45">
                    <label className="text-sm font-medium shrink-0">
                      Grade:
                    </label>
                    <Select
                      value={selectedGrade}
                      onValueChange={setSelectedGrade}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id}>
                            {grade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Class Selector (only in class view mode) */}
                  {viewMode === "class" && (
                    <div className="flex items-center gap-2 min-w-45">
                      <label className="text-sm font-medium shrink-0">
                        Class:
                      </label>
                      <Select
                        value={selectedClass}
                        onValueChange={setSelectedClass}
                        disabled={!selectedGrade}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((classItem) => (
                            <SelectItem key={classItem.id} value={classItem.id}>
                              {classItem.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Show Class Breakdown Toggle (only in grade view) */}
                  {viewMode === "grade" && selectedGrade && (
                    <div className="flex items-center space-x-2 ml-auto">
                      <Switch
                        id="class-breakdown"
                        checked={showClassBreakdown}
                        onCheckedChange={setShowClassBreakdown}
                      />
                      <Label htmlFor="class-breakdown" className="text-sm">
                        Show per-class breakdown
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                label="Total Students"
                value={summary.totalStudents}
                icon={Users}
                variant="primary"
              />

              <StatsCard
                label="Male Students"
                value={summary.maleStudents}
                icon={Users}
                variant="info"
              />

              <StatsCard
                label="Female Students"
                value={summary.femaleStudents}
                icon={Users}
                variant="danger"
              />

              <StatsCard
                label="Avg Attendance Rate"
                value={`${summary.averageAttendanceRate}%`}
                icon={TrendingUp}
                variant="success"
                subtitle="Last 90 days"
              />
            </div>
          )}

          {/* Empty State */}
          {!dataLoading &&
            attendanceData.length === 0 &&
            (viewMode === "grade" ? !selectedGrade : !selectedClass) && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Users className="h-12 w-12 mb-4" />
                    <p className="text-lg font-medium">
                      Select filters to view attendance
                    </p>
                    <p className="text-sm mt-2">
                      Choose a grade{viewMode === "class" && " and class"} to
                      see attendance trends
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Chart */}
          {!dataLoading && attendanceData.length > 0 && (
            <AttendanceChartInteractive
              data={attendanceData}
              title={
                viewMode === "grade"
                  ? `${
                      grades.find((g) => g.id === selectedGrade)?.name ||
                      "Grade"
                    } Attendance Trend`
                  : `${
                      classes.find((c) => c.id === selectedClass)?.name ||
                      "Class"
                    } Attendance Trend`
              }
              description="Daily attendance showing male and female students present"
            />
          )}

          {/* Class Breakdown Table */}
          {showClassBreakdown && classBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per-Class Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Male</TableHead>
                      <TableHead className="text-center">Female</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classBreakdown.map((classData, index) => (
                      <TableRow
                        key={classData.className}
                        className={
                          index % 2 === 0 ? "bg-background" : "bg-muted/30"
                        }>
                        <TableCell className="font-medium">
                          {classData.className}
                        </TableCell>
                        <TableCell className="text-center">
                          {classData.totalStudents}
                        </TableCell>
                        <TableCell className="text-center">
                          {classData.maleCount}
                        </TableCell>
                        <TableCell className="text-center">
                          {classData.femaleCount}
                        </TableCell>
                        <TableCell className="text-center">
                          {classData.totalPresent}
                        </TableCell>
                        <TableCell className="text-center">
                          {classData.totalAbsent}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={
                              classData.attendanceRate >= 90
                                ? "text-green-600 font-semibold"
                                : classData.attendanceRate >= 75
                                ? "text-yellow-600 font-semibold"
                                : "text-red-600 font-semibold"
                            }>
                            {classData.attendanceRate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell className="text-center font-bold">
                        {classBreakdown.reduce(
                          (sum, c) => sum + c.totalStudents,
                          0
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {classBreakdown.reduce(
                          (sum, c) => sum + c.maleCount,
                          0
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {classBreakdown.reduce(
                          (sum, c) => sum + c.femaleCount,
                          0
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {classBreakdown.reduce(
                          (sum, c) => sum + c.totalPresent,
                          0
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {classBreakdown.reduce(
                          (sum, c) => sum + c.totalAbsent,
                          0
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {(
                          classBreakdown.reduce(
                            (sum, c) => sum + c.attendanceRate,
                            0
                          ) / (classBreakdown.length || 1)
                        ).toFixed(1)}
                        %
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Data Loading Indicator */}
          {dataLoading && (
            <Card><CardContent className="pt-5 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => {
                const ws = ["w-36","w-28","w-40","w-24","w-36","w-28"];
                return (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className={`h-4 ${ws[i]}`} />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                );
              })}
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}
