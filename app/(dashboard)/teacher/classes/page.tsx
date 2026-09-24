"use client";

import { useState, useEffect } from "react";
import { cn, getErrorMessage } from "@/lib/utils";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Users,
  BookOpen,
  GraduationCap,
  Check,
  X,
  Clock,
  Eye,
  ListCheck,
  Download,
  Search,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AttendanceTrendChart } from "@/components/classes/attendance-trend-chart";
import { DetailedAttendanceSheet } from "@/components/classes/detailed-attendance-sheet";
import { History } from "lucide-react";
import { useInvalidation } from "@/hooks/useInvalidation";
import { toast } from "sonner";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface ClassData {
  id: string;
  name: string;
  gradeLevel?: string;
  totalStudents?: number;
  capacity?: number;
  isClassTeacher: boolean;
  teachingSubject?: string;
  teachingSubjectId?: string;
  status: string;
}

interface StudentData {
  id: string;
  name: string;
  gender: "M" | "F";
  age: number;
}

export default function TeacherClassesPage() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  // A teacher can teach the same class under two different subjects, in
  // which case subjectTeacherClasses has two entries sharing the same
  // classId — this disambiguates which row is selected. Set together with
  // selectedClassId everywhere selection changes.
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [studentPage, setStudentPage] = useState(1);
  const [classTeacherPage, setClassTeacherPage] = useState(1);
  const [subjectTeacherPage, setSubjectTeacherPage] = useState(1);
  const [sheetSearchQuery, setSheetSearchQuery] = useState("");
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceRemarks, setAttendanceRemarks] = useState<Record<string, string>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [registerSearchQuery, setRegisterSearchQuery] = useState("");
  const [activeTermId, setActiveTermId] = useState<string | null>(null);
  const [attendanceSheetOpen, setAttendanceSheetOpen] = useState(false);
  const [chartRefreshKey, setChartRefreshKey] = useState(0);

  const [classTeacherClasses, setClassTeacherClasses] = useState<ClassData[]>([]);
  const [subjectTeacherClasses, setSubjectTeacherClasses] = useState<ClassData[]>([]);
  const [studentsByClass, setStudentsByClass] = useState<Record<string, StudentData[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allClasses = [...classTeacherClasses, ...subjectTeacherClasses];
  const selectedClass = allClasses.find(
    (c) => c.id === selectedClassId && (c.teachingSubjectId ?? null) === selectedSubjectId
  );
  const selectedStudents = selectedClassId ? studentsByClass[selectedClassId] || [] : [];
  const isClassTeacher = classTeacherClasses.some((c) => c.id === selectedClassId);

  // ── Fetch active term ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchActiveTerm = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;
        const response = await fetch("/api/terms/active", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const result = await response.json();
          if (!result.success) return;
          setActiveTermId(result.data.id);
        }
      } catch (err) {
        console.error("Error fetching active term:", err);
      }
    };
    fetchActiveTerm();
  }, []);

  // ── Fetch classes ────────────────────────────────────────────────────────────
  const fetchClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      if (!token) { setError("No authentication token found"); return; }

      const response = await fetch("/api/teacher/classes", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        if (!result.success) {
          setError(result.error || "Failed to load classes");
          setClassTeacherClasses([]);
          setSubjectTeacherClasses([]);
          return;
        }
        const data = result.data;
        setClassTeacherClasses(data.classTeacherClasses || []);
        setSubjectTeacherClasses(data.subjectTeacherClasses || []);
        setError(null);

        if (data.classTeacherClasses?.length > 0) {
          setSelectedClassId(data.classTeacherClasses[0].id);
          setSelectedSubjectId(data.classTeacherClasses[0].teachingSubjectId ?? null);
        } else if (data.subjectTeacherClasses?.length > 0) {
          setSelectedClassId(data.subjectTeacherClasses[0].id);
          setSelectedSubjectId(data.subjectTeacherClasses[0].teachingSubjectId ?? null);
        }
      } else if (response.status === 401) {
        setError("Unauthorized - please log in again");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || `Failed to load classes (${response.status})`);
      }
    } catch (err) {
      console.error("Error fetching classes:", err);
      setError("Error loading classes");
    } finally {
      setLoading(false);
    }
  };

  useInvalidation("teacher-classes", () => { fetchClasses(); });
  useEffect(() => { fetchClasses(); }, []);

  // ── Fetch students when class selected ──────────────────────────────────────
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClassId || studentsByClass[selectedClassId]) return;
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;
        const response = await fetch(`/api/teacher/classes/${selectedClassId}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const result = await response.json();
          if (!result.success) return;
          setStudentsByClass((prev) => ({ ...prev, [selectedClassId]: result.data.students || [] }));
        }
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };
    fetchStudents();
  }, [selectedClassId, studentsByClass]);

  // ── Attendance handlers ──────────────────────────────────────────────────────
  const handleOpenAttendance = () => {
    const initialRecords: Record<string, AttendanceStatus> = {};
    selectedStudents.forEach((s) => { initialRecords[s.id] = "PRESENT"; });
    setAttendanceRecords(initialRecords);
    setAttendanceRemarks({});
    setRegisterSearchQuery("");
    setAttendanceDialogOpen(true);
  };

  const handleAttendanceStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!activeTermId) { toast.error("No active term found. Please contact administrator."); return; }
    if (!selectedClassId) { toast.error("No class selected."); return; }
    try {
      setSavingAttendance(true);
      const token = localStorage.getItem("auth_token");
      if (!token) { toast.error("No authentication token found. Please log in again."); return; }

      const now = new Date();
      const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

      const payload = {
        classId: selectedClassId,
        termId: activeTermId,
        date: todayUtc.toISOString(),
        records: selectedStudents.map((student) => ({
          studentId: student.id,
          status: attendanceRecords[student.id],
          remarks: attendanceRemarks[student.id] || undefined,
        })),
      };

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        if (!result.success) { toast.error(result.error || "Failed to save attendance"); return; }
        toast.success("Attendance saved successfully!");
        setAttendanceDialogOpen(false);
        setChartRefreshKey((k) => k + 1);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to save attendance");
      }
    } catch (err) {
      console.error("Error saving attendance:", err);
      toast.error("Error saving attendance. Please try again.");
    } finally {
      setSavingAttendance(false);
    }
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [pendingExport, setPendingExport] = useState<{ classId: string; mode: "class" | "subject"; subjectId?: string } | null>(null);
  const [exportingFormat, setExportingFormat] = useState<"csv" | "pdf" | null>(null);

  const handleExportClassListClick = (classId: string, mode: "class" | "subject", subjectId?: string) => {
    setPendingExport({ classId, mode, subjectId });
    setExportDialogOpen(true);
  };

  const handleExportClassList = async (format: "csv" | "pdf") => {
    if (!pendingExport) return;
    const { classId, mode, subjectId } = pendingExport;
    try {
      setExportingFormat(format);
      const token = localStorage.getItem("auth_token");
      if (!token) { toast.error("No authentication token found"); return; }
      toast.info(`Generating ${format.toUpperCase()} class list...`);
      const subjectParam = mode === "subject" && subjectId ? `&subjectId=${subjectId}` : "";
      const response = await fetch(
        `/api/teacher/classes/export-class-list?classId=${classId}&mode=${mode}${subjectParam}&format=${format}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to export class list");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contentDisposition = response.headers.get("Content-Disposition");
      a.download = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `class_list_${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Class list exported successfully");
      setExportDialogOpen(false);
      setPendingExport(null);
    } catch (error) {
      console.error("Error exporting class list:", error);
      toast.error(getErrorMessage(error, "Failed to export class list"));
    } finally {
      setExportingFormat(null);
    }
  };

  // ── Pagination ───────────────────────────────────────────────────────────────
  const STUDENTS_PER_PAGE = 15;
  const CLASSES_PER_PAGE = 8;

  const totalClassTeacherPages = Math.ceil(classTeacherClasses.length / CLASSES_PER_PAGE) || 1;
  const paginatedClassTeacherClasses = classTeacherClasses.slice(
    (classTeacherPage - 1) * CLASSES_PER_PAGE,
    classTeacherPage * CLASSES_PER_PAGE
  );

  const totalSubjectTeacherPages = Math.ceil(subjectTeacherClasses.length / CLASSES_PER_PAGE) || 1;
  const paginatedSubjectTeacherClasses = subjectTeacherClasses.slice(
    (subjectTeacherPage - 1) * CLASSES_PER_PAGE,
    subjectTeacherPage * CLASSES_PER_PAGE
  );

  // Reset to page 1 whenever the underlying class lists change (e.g. refetch)
  useEffect(() => { setClassTeacherPage(1); }, [classTeacherClasses.length]);
  useEffect(() => { setSubjectTeacherPage(1); }, [subjectTeacherClasses.length]);

  // Reset page + search when class changes
  useEffect(() => {
    setStudentPage(1);
    setSheetSearchQuery("");
  }, [selectedClassId]);

  // Also reset page when search changes
  useEffect(() => {
    setStudentPage(1);
  }, [sheetSearchQuery]);

  const sheetFilteredStudents = sheetSearchQuery.trim()
    ? selectedStudents.filter((s) =>
        s.name.toLowerCase().includes(sheetSearchQuery.toLowerCase())
      )
    : selectedStudents;

  const totalStudentPages = Math.ceil(sheetFilteredStudents.length / STUDENTS_PER_PAGE);
  const paginatedStudents = sheetFilteredStudents.slice(
    (studentPage - 1) * STUDENTS_PER_PAGE,
    studentPage * STUDENTS_PER_PAGE
  );

  // ── Derived ──────────────────────────────────────────────────────────────────
  const genderDistribution = selectedStudents.reduce(
    (acc, s) => { if (s.gender === "M") acc.boys++; else acc.girls++; return acc; },
    { boys: 0, girls: 0 }
  );

  // ── Skeleton rows — mirror the mobile card row and desktop table row shapes ───
  const renderSkeletonRows = () =>
    Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className={cn("border-b", i % 2 === 0 ? "bg-background" : "bg-muted/30")}>
        {/* Mobile shape: name + subtitle line on the left, chevron on the right */}
        <div className="lg:hidden flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-4 w-4 rounded-full shrink-0" />
        </div>
        {/* Desktop shape: Class / Subject / Status / Action columns */}
        <div className="hidden lg:flex items-center gap-4 px-2 py-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <div className="ml-auto flex gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    ));

  // ── Shared row renderer helpers ──────────────────────────────────────────────
  const renderClassRows = (classes: ClassData[], mode: "class" | "subject") =>
    classes.flatMap((classItem, index) => [
      // ── Mobile tappable row ────────────────────────────────────────────────
      <tr
        key={`m-${classItem.id}-${classItem.teachingSubjectId ?? "ct"}`}
        className={cn(
          "lg:hidden border-b cursor-pointer active:bg-muted/70 transition-colors",
          index % 2 === 0 ? "bg-background" : "bg-muted/30",
          selectedClassId === classItem.id &&
            (classItem.teachingSubjectId ?? null) === selectedSubjectId &&
            "bg-primary/10"
        )}
        onClick={() => {
          setSelectedClassId(classItem.id);
          setSelectedSubjectId(classItem.teachingSubjectId ?? null);
          setMobileDetailOpen(true);
        }}
      >
        <td className="py-3.5 px-4" colSpan={4}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{classItem.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {classItem.totalStudents || 0}/{classItem.capacity || 0} students
                {classItem.teachingSubject && ` · ${classItem.teachingSubject}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 text-xs hidden sm:inline-flex">
                {classItem.status}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </td>
      </tr>,

      // ── Desktop table row ──────────────────────────────────────────────────
      <tr
        key={`d-${classItem.id}-${classItem.teachingSubjectId ?? "ct"}`}
        className={cn(
          "hidden lg:table-row border-b hover:bg-muted/50 transition-colors",
          index % 2 === 0 ? "bg-background" : "bg-muted/30",
          selectedClassId === classItem.id &&
            (classItem.teachingSubjectId ?? null) === selectedSubjectId &&
            "bg-primary/10"
        )}
      >
        <td className="py-3 px-2">
          <div>
            <p className="font-semibold text-sm">{classItem.name}</p>
            <p className="text-xs text-muted-foreground">
              {classItem.totalStudents || 0}/{classItem.capacity || 0} students
            </p>
          </div>
        </td>
        <td className="py-3 px-2">
          <span className="text-sm font-medium text-blue-600">
            {classItem.teachingSubject || "—"}
          </span>
        </td>
        <td className="py-3 px-2">
          <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
            {classItem.status}
          </Badge>
        </td>
        <td className="py-3 px-2 text-center">
          <div className="flex gap-1 justify-center">
            <Button
              variant="outline" size="sm"
              onClick={() => {
                setSelectedClassId(classItem.id);
                setSelectedSubjectId(classItem.teachingSubjectId ?? null);
              }}
              className="h-8 w-8 p-0" title="View details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => handleExportClassListClick(classItem.id, mode, classItem.teachingSubjectId)}
              className="h-8 w-8 p-0" title="Export class list"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>,
    ]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page header — desktop only ──────────────────────────────────────── */}
      <div className="hidden lg:flex items-start justify-between mt-2">
        <div className="flex flex-col space-y-2">
          <h1 className="text-xl font-bold">My Classes</h1>
          <p className="text-muted-foreground text-sm">
            {loading
              ? "Loading classes..."
              : `${allClasses.length} ${allClasses.length === 1 ? "class" : "classes"} assigned to you`}
          </p>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 lg:mx-0 bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: class list with tabs ──────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card className={cn(
            "flex flex-col",
            "rounded-none border-x-0 h-[calc(100svh-8rem)]",
            "lg:rounded-lg lg:border-x lg:h-[calc(100vh-7rem)]"
          )}>
            <CardContent className="flex-1 overflow-hidden p-0">
              <Tabs defaultValue="class-teacher" className="h-full flex flex-col">

                {/* Tab buttons */}
                <div className="px-4 pt-4 lg:px-6 lg:pt-6 shrink-0">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="class-teacher">
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Class Teacher
                    </TabsTrigger>
                    <TabsTrigger value="subject-teacher">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Subject Teacher
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* ── Class Teacher tab ──────────────────────────────────── */}
                <TabsContent value="class-teacher" className="flex-1 overflow-hidden mt-0 pb-0 lg:px-6 lg:pb-6">
                  <ScrollArea className="h-full">
                    <div className="pt-4">
                      {loading ? (
                        <div>{renderSkeletonRows()}</div>
                      ) : (
                        <>
                          <table className="w-full">
                            <thead className="border-b hidden lg:table-header-group">
                              <tr>
                                <th className="text-left py-3 px-2 font-semibold text-sm">Class</th>
                                <th className="text-left py-3 px-2 font-semibold text-sm">Subject</th>
                                <th className="text-left py-3 px-2 font-semibold text-sm">Status</th>
                                <th className="text-center py-3 px-2 font-semibold text-sm">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {renderClassRows(paginatedClassTeacherClasses, "class")}
                            </tbody>
                          </table>

                          {classTeacherClasses.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground px-4">
                              <p>No class assigned as class teacher</p>
                            </div>
                          )}

                          {/* Pagination — desktop only; mobile uses the sheet's own scroll */}
                          {totalClassTeacherPages > 1 && (
                            <div className="hidden lg:flex items-center justify-between py-2 px-2">
                              <span className="text-xs text-muted-foreground">
                                {(classTeacherPage - 1) * CLASSES_PER_PAGE + 1}–{Math.min(classTeacherPage * CLASSES_PER_PAGE, classTeacherClasses.length)} of {classTeacherClasses.length}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => setClassTeacherPage((p) => p - 1)}
                                  disabled={classTeacherPage === 1}
                                  className="h-7 w-7 p-0"
                                >
                                  <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-xs text-muted-foreground px-1">
                                  {classTeacherPage} / {totalClassTeacherPages}
                                </span>
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => setClassTeacherPage((p) => p + 1)}
                                  disabled={classTeacherPage === totalClassTeacherPages}
                                  className="h-7 w-7 p-0"
                                >
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Chart — shown on every screen size, beneath the class list */}
                          {classTeacherClasses.length > 0 && (() => {
                            const chartClass =
                              classTeacherClasses.find((c) => c.id === selectedClassId) ||
                              classTeacherClasses[0];
                            return (
                              <div className="px-4 lg:px-0">
                                <AttendanceTrendChart
                                  key={`${chartRefreshKey}-${chartClass.id}`}
                                  classId={chartClass.id}
                                  className={chartClass.name}
                                />
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* ── Subject Teacher tab ────────────────────────────────── */}
                <TabsContent value="subject-teacher" className="flex-1 overflow-hidden mt-0 pb-0 lg:px-6 lg:pb-6">
                  <ScrollArea className="h-full">
                    <div className="pt-4">
                      {loading ? (
                        <div>{renderSkeletonRows()}</div>
                      ) : (
                        <>
                          <table className="w-full">
                            <thead className="border-b hidden lg:table-header-group">
                              <tr>
                                <th className="text-left py-3 px-2 font-semibold text-sm">Class</th>
                                <th className="text-left py-3 px-2 font-semibold text-sm">Subject</th>
                                <th className="text-left py-3 px-2 font-semibold text-sm">Status</th>
                                <th className="text-center py-3 px-2 font-semibold text-sm">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {renderClassRows(paginatedSubjectTeacherClasses, "subject")}
                            </tbody>
                          </table>

                          {subjectTeacherClasses.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground px-4">
                              <p>No classes assigned as subject teacher</p>
                            </div>
                          )}

                          {/* Pagination — desktop only; mobile uses the sheet's own scroll */}
                          {totalSubjectTeacherPages > 1 && (
                            <div className="hidden lg:flex items-center justify-between py-2 px-2">
                              <span className="text-xs text-muted-foreground">
                                {(subjectTeacherPage - 1) * CLASSES_PER_PAGE + 1}–{Math.min(subjectTeacherPage * CLASSES_PER_PAGE, subjectTeacherClasses.length)} of {subjectTeacherClasses.length}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => setSubjectTeacherPage((p) => p - 1)}
                                  disabled={subjectTeacherPage === 1}
                                  className="h-7 w-7 p-0"
                                >
                                  <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-xs text-muted-foreground px-1">
                                  {subjectTeacherPage} / {totalSubjectTeacherPages}
                                </span>
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => setSubjectTeacherPage((p) => p + 1)}
                                  disabled={subjectTeacherPage === totalSubjectTeacherPages}
                                  className="h-7 w-7 p-0"
                                >
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: details card — desktop only ──────────────────────────── */}
        <div className="hidden lg:block lg:col-span-1">
          <Card className="h-[calc(100vh-7rem)] flex flex-col">
            <div className="px-6 pt-6 pb-3 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base">
                    {selectedClass ? selectedClass.name : "Details"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedClass ? `${selectedStudents.length} students` : "Select a class to view details"}
                  </p>
                </div>
                {selectedClass && selectedStudents.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                      <Users className="h-3 w-3" />
                      <span className="font-medium">Males: {genderDistribution.boys}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-pink-50 text-pink-700 rounded">
                      <Users className="h-3 w-3" />
                      <span className="font-medium">Females: {genderDistribution.girls}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden px-0">
              {selectedClass ? (
                <div className="flex flex-col h-full">
                  <ScrollArea className="flex-1 px-6">
                    <div className="border rounded-md mt-2">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="border-r">Name</TableHead>
                            <TableHead className="border-r">Gender</TableHead>
                            <TableHead className="text-right">Age</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedStudents.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium text-sm border-r">{student.name}</TableCell>
                              <TableCell className="text-sm border-r">{student.gender}</TableCell>
                              <TableCell className="text-right text-sm">{student.age}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Desktop pagination */}
                    {totalStudentPages > 1 && (
                      <div className="flex items-center justify-between py-2 px-0.5">
                        <span className="text-xs text-muted-foreground">
                          {(studentPage - 1) * STUDENTS_PER_PAGE + 1}–{Math.min(studentPage * STUDENTS_PER_PAGE, sheetFilteredStudents.length)} of {sheetFilteredStudents.length}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline" size="sm"
                            onClick={() => setStudentPage((p) => p - 1)}
                            disabled={studentPage === 1}
                            className="h-7 w-7 p-0"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-xs text-muted-foreground px-1">
                            {studentPage} / {totalStudentPages}
                          </span>
                          <Button
                            variant="outline" size="sm"
                            onClick={() => setStudentPage((p) => p + 1)}
                            disabled={studentPage === totalStudentPages}
                            className="h-7 w-7 p-0"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                  {isClassTeacher && (
                    <div className="mt-auto px-6 pt-4 pb-6 border-t space-y-2 shrink-0">
                      <Button className="w-full" onClick={handleOpenAttendance}>
                        <ListCheck className="h-4 w-4 mr-2" />
                        Take Register
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => setAttendanceSheetOpen(true)}>
                        <History className="h-4 w-4 mr-2" />
                        View Attendance
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No class selected
                </div>
              )}
            </div>
          </Card>
        </div>

      </div>

      {/* ── Mobile detail sheet ─────────────────────────────────────────────── */}
      <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <SheetContent
          side="bottom"
          className="lg:hidden rounded-t-2xl p-0 max-h-[92vh] flex flex-col overflow-hidden"
        >
          {selectedClass && (
            <>
              {/* Sheet header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b shrink-0">
                <div>
                  <h2 className="font-semibold text-base">{selectedClass.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {!studentsByClass[selectedClass.id]
                      ? "Loading students…"
                      : `${selectedStudents.length} students`}
                  </p>
                </div>
                {selectedStudents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 rounded text-xs">
                      <Users className="h-3 w-3" />
                      <span className="font-medium">M {genderDistribution.boys}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400 rounded text-xs">
                      <Users className="h-3 w-3" />
                      <span className="font-medium">F {genderDistribution.girls}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">

                {/* ── Search field ── */}
                <div className="px-4 pt-3 pb-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search students…"
                      value={sheetSearchQuery}
                      onChange={(e) => setSheetSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </div>

                {/* ── Student register with pagination ── */}
                <div className="px-4 pb-4">
                  {!studentsByClass[selectedClass.id] ? (
                    <div className="space-y-3 pt-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-11 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : selectedStudents.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      No students in this class yet.
                    </div>
                  ) : sheetFilteredStudents.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No students match your search.
                    </div>
                  ) : (
                    <>
                      <div className="border rounded-xl overflow-hidden mt-3">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead className="w-16 text-center">Gender</TableHead>
                              <TableHead className="w-12 text-right">Age</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedStudents.map((student) => (
                              <TableRow key={student.id}>
                                <TableCell className="font-medium text-sm">{student.name}</TableCell>
                                <TableCell className="text-center">
                                  <span className={cn(
                                    "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold",
                                    student.gender === "M" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                                  )}>
                                    {student.gender}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right text-sm">{student.age}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      {totalStudentPages > 1 && (
                        <div className="flex items-center justify-between mt-2.5 px-0.5">
                          <span className="text-xs text-muted-foreground">
                            {(studentPage - 1) * STUDENTS_PER_PAGE + 1}–{Math.min(studentPage * STUDENTS_PER_PAGE, sheetFilteredStudents.length)} of {sheetFilteredStudents.length}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline" size="sm"
                              onClick={() => setStudentPage((p) => p - 1)}
                              disabled={studentPage === 1}
                              className="h-7 w-7 p-0"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <span className="text-xs text-muted-foreground px-1">
                              {studentPage} / {totalStudentPages}
                            </span>
                            <Button
                              variant="outline" size="sm"
                              onClick={() => setStudentPage((p) => p + 1)}
                              disabled={studentPage === totalStudentPages}
                              className="h-7 w-7 p-0"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Footer actions — 3 buttons in a row */}
              <div className="shrink-0 px-4 py-3 border-t">
                <div className="flex gap-2">
                  {isClassTeacher && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleOpenAttendance}
                      >
                        <ListCheck className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        <span className="truncate">Take Register</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setAttendanceSheetOpen(true)}
                      >
                        <History className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        <span className="truncate">Attendance</span>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("flex-1", !isClassTeacher && "w-full")}
                    onClick={() => handleExportClassListClick(selectedClass.id, isClassTeacher ? "class" : "subject", selectedClass.teachingSubjectId)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                    <span className="truncate">Export</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Attendance register dialog ───────────────────────────────────────── */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className={cn(
          // Mobile: full-screen, no rounding, no padding (we handle it internally)
          "p-0 gap-0 flex flex-col w-screen h-dvh max-w-none rounded-none",
          // Desktop: centred overlay with max size
          "sm:w-auto sm:h-auto sm:max-w-4xl sm:max-h-[90vh] sm:rounded-lg"
        )}>

          {/* ── Header ── */}
          <DialogHeader className="shrink-0 px-4 pt-4 pb-3 border-b sm:px-6 sm:pt-6 sm:pb-4">
            {/* Mobile header — stacked */}
            <div className="sm:hidden space-y-3">
              <div>
                <DialogTitle className="text-base font-semibold leading-tight">
                  Take Register · {selectedClass?.name}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric",
                  })}
                </p>
              </div>
              {/* Status counts — full-width row */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 text-green-700 rounded-md">
                  <Check className="h-3.5 w-3.5" />
                  <span className="font-semibold text-sm">
                    {Object.values(attendanceRecords).filter((s) => s === "PRESENT").length}
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-700 rounded-md">
                  <X className="h-3.5 w-3.5" />
                  <span className="font-semibold text-sm">
                    {Object.values(attendanceRecords).filter((s) => s === "ABSENT").length}
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-yellow-50 text-yellow-700 rounded-md">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-semibold text-sm">
                    {Object.values(attendanceRecords).filter((s) => s === "LATE").length}
                  </span>
                </div>
              </div>
            </div>
            {/* Desktop header — side-by-side */}
            <div className="hidden sm:flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg">
                  Take Register - {selectedClass?.name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-md">
                  <Check className="h-4 w-4" />
                  <span className="font-semibold">
                    {Object.values(attendanceRecords).filter((s) => s === "PRESENT").length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-md">
                  <X className="h-4 w-4" />
                  <span className="font-semibold">
                    {Object.values(attendanceRecords).filter((s) => s === "ABSENT").length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-md">
                  <Clock className="h-4 w-4" />
                  <span className="font-semibold">
                    {Object.values(attendanceRecords).filter((s) => s === "LATE").length}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* ── Search bar ── */}
          <div className="shrink-0 px-4 py-2.5 border-b sm:px-6 sm:py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search students…"
                value={registerSearchQuery}
                onChange={(e) => setRegisterSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          {/* ── Student list ── */}
          {(() => {
            const q = registerSearchQuery.trim().toLowerCase();
            const visible = q
              ? selectedStudents.filter((s) => s.name.toLowerCase().includes(q))
              : selectedStudents;

            return (
              <>
                {/* Mobile: card-style rows */}
                <div className="sm:hidden flex-1 overflow-y-auto">
                  {visible.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No students match your search
                    </div>
                  ) : (
                    visible.map((student, index) => {
                      const status = attendanceRecords[student.id];
                      const needsRemark = status === "ABSENT" || status === "LATE" || status === "EXCUSED";
                      return (
                        <div key={student.id} className={cn(
                          "px-4 py-3 border-b",
                          index % 2 !== 0 && "bg-muted/20"
                        )}>
                          {/* Name + gender + status buttons */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-5 text-center shrink-0">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0 flex items-center gap-1.5">
                              <span className="font-medium text-sm truncate">{student.name}</span>
                              <span className={cn(
                                "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold shrink-0",
                                student.gender === "M" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                              )}>
                                {student.gender}
                              </span>
                            </div>
                            {/* Status buttons */}
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant={status === "PRESENT" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleAttendanceStatusChange(student.id, "PRESENT")}
                                className="h-8 w-8 p-0" title="Present"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant={status === "ABSENT" ? "destructive" : "outline"}
                                size="sm"
                                onClick={() => handleAttendanceStatusChange(student.id, "ABSENT")}
                                className="h-8 w-8 p-0" title="Absent"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant={status === "LATE" ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => handleAttendanceStatusChange(student.id, "LATE")}
                                className="h-8 w-8 p-0" title="Late"
                              >
                                <Clock className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant={status === "EXCUSED" ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => handleAttendanceStatusChange(student.id, "EXCUSED")}
                                className="h-8 px-2" title="Excused"
                              >
                                <span className="text-[11px] font-semibold">EXC</span>
                              </Button>
                            </div>
                          </div>
                          {/* Remarks — only when non-present */}
                          {needsRemark && (
                            <Textarea
                              placeholder={`Reason for ${status?.toLowerCase()}…`}
                              className="mt-2 text-xs min-h-[52px] resize-none"
                              value={attendanceRemarks[student.id] || ""}
                              onChange={(e) =>
                                setAttendanceRemarks((prev) => ({ ...prev, [student.id]: e.target.value }))
                              }
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop: table view */}
                <div className="hidden sm:flex flex-1 overflow-hidden flex-col px-6 pb-0">
                  <div className="border rounded-lg overflow-hidden flex-1 flex flex-col">
                    <ScrollArea className="h-[440px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur z-10">
                          <TableRow>
                            <TableHead className="w-16 text-center">#</TableHead>
                            <TableHead className="min-w-[250px]">Student Name</TableHead>
                            <TableHead className="w-20 text-center">Gender</TableHead>
                            <TableHead className="w-[200px] text-center">Attendance Status</TableHead>
                            <TableHead className="min-w-[280px]">Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visible.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                                No students match your search
                              </TableCell>
                            </TableRow>
                          ) : visible.map((student, index) => (
                            <TableRow key={student.id} className="hover:bg-muted/30">
                              <TableCell className="text-center text-muted-foreground font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell className="text-center">
                                <span className={cn(
                                  "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold",
                                  student.gender === "M" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"
                                )}>
                                  {student.gender}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1.5 justify-center">
                                  <Button
                                    variant={attendanceRecords[student.id] === "PRESENT" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleAttendanceStatusChange(student.id, "PRESENT")}
                                    className="h-9 w-9 p-0" title="Present"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant={attendanceRecords[student.id] === "ABSENT" ? "destructive" : "outline"}
                                    size="sm"
                                    onClick={() => handleAttendanceStatusChange(student.id, "ABSENT")}
                                    className="h-9 w-9 p-0" title="Absent"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant={attendanceRecords[student.id] === "LATE" ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => handleAttendanceStatusChange(student.id, "LATE")}
                                    className="h-9 w-9 p-0" title="Late"
                                  >
                                    <Clock className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant={attendanceRecords[student.id] === "EXCUSED" ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => handleAttendanceStatusChange(student.id, "EXCUSED")}
                                    className="h-9 px-3" title="Excused"
                                  >
                                    <span className="text-xs font-semibold">EXC</span>
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                {attendanceRecords[student.id] === "ABSENT" ||
                                attendanceRecords[student.id] === "EXCUSED" ||
                                attendanceRecords[student.id] === "LATE" ? (
                                  <Textarea
                                    placeholder={`Reason for ${attendanceRecords[student.id]?.toLowerCase()}...`}
                                    className="text-xs min-h-[65px] resize-none"
                                    value={attendanceRemarks[student.id] || ""}
                                    onChange={(e) =>
                                      setAttendanceRemarks((prev) => ({ ...prev, [student.id]: e.target.value }))
                                    }
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">No remarks needed</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>
              </>
            );
          })()}

          {/* ── Footer ── */}
          <div className="shrink-0 px-4 py-3 border-t sm:px-6 sm:py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="hidden sm:inline">Total Students: </span>
                <span className="font-semibold text-foreground">{selectedStudents.length}</span>
                <span className="sm:hidden text-xs"> students</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAttendanceDialogOpen(false)}
                  disabled={savingAttendance}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveAttendance} disabled={savingAttendance}>
                  {savingAttendance ? "Saving…" : "Save Attendance"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detailed attendance sheet ────────────────────────────────────────── */}
      <DetailedAttendanceSheet
        open={attendanceSheetOpen}
        onOpenChange={setAttendanceSheetOpen}
        classData={
          selectedClass
            ? { id: selectedClass.id, name: selectedClass.name, gradeLevel: selectedClass.gradeLevel }
            : null
        }
      />

      {/* ── Export format dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={exportDialogOpen}
        onOpenChange={(open) => {
          if (exportingFormat) return; // don't let a click-away cancel mid-export
          setExportDialogOpen(open);
          if (!open) setPendingExport(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Export Class List</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Choose a file format to download.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleExportClassList("csv")}
              disabled={exportingFormat !== null}
              className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-muted/50 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <FileSpreadsheet className="h-7 w-7 text-green-600" />
              <span className="text-sm font-medium">
                {exportingFormat === "csv" ? "Generating…" : "CSV"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleExportClassList("pdf")}
              disabled={exportingFormat !== null}
              className="flex flex-col items-center gap-2 rounded-lg border p-4 hover:bg-muted/50 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <FileText className="h-7 w-7 text-red-600" />
              <span className="text-sm font-medium">
                {exportingFormat === "pdf" ? "Generating…" : "PDF"}
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
