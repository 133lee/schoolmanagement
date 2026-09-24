"use client";

import { useState, useEffect, useMemo } from "react";
import { formatCompactClassLabel } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  Search,
  UserPlus,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Gender } from "@/types/prisma-enums";

/* ================= TYPES ================= */

interface Student {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  studentNumber: string;
  gender: string;
  status: string;
  enrollments?: Array<{
    academicYearId: string;
    class: {
      id: string;
      name: string;
      grade: { name: string };
    };
  }>;
}

interface ClassData {
  id: string;
  name: string;
  capacity: number;
  currentEnrolled: number;
  grade: { id: string; name: string };
}

/* ================= PAGE ================= */

export default function EnrollStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const { toast } = useToast();

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [academicYearId, setAcademicYearId] = useState("");

  /* ---------------- Filters ---------------- */
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<Gender | "all">("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState<
    "all" | "enrolled" | "not_enrolled"
  >("not_enrolled");

  /* ================= DATA ================= */

  useEffect(() => {
    const fetchClass = async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/classes/${classId}?include=relations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClassData(data.data);
      }
    };
    fetchClass();
  }, [classId]);

  useEffect(() => {
    const fetchYear = async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/academic-years/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAcademicYearId(data.data.id);
      }
    };
    fetchYear();
  }, []);

  useEffect(() => {
    if (!academicYearId) return;

    const fetchStudents = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("auth_token");

        // Build query parameters for backend
        const params = new URLSearchParams();
        params.append("mode", "all");
        params.append("academicYearId", academicYearId);
        params.append("includeEnrollments", "true");

        // Apply enrollment filter
        if (enrollmentFilter === "not_enrolled") {
          params.append("filterUnenrolled", "true");
        } else if (enrollmentFilter === "enrolled") {
          params.append("filterEnrolled", "true");
        }
        // "all" doesn't need any filter parameter

        const res = await fetch(`/api/students?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        // Filter only active students
        const activeStudents = (data.data || []).filter(
          (s: Student) => s.status === "ACTIVE"
        );
        setStudents(activeStudents);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load students",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYearId, enrollmentFilter]);

  /* ================= FILTER LOGIC ================= */

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Search filter
      if (search) {
        const fullName =
          `${student.firstName} ${student.middleName || ""} ${student.lastName}`.toLowerCase();
        const searchLower = search.toLowerCase();
        if (
          !fullName.includes(searchLower) &&
          !student.studentNumber.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Gender filter
      if (genderFilter !== "all" && student.gender !== genderFilter) {
        return false;
      }

      // Don't show students already enrolled in this class
      const isEnrolledInThisClass = student.enrollments?.some(
        (e) => e.class.id === classId
      );
      if (isEnrolledInThisClass) {
        return false;
      }

      return true;
    });
  }, [students, search, genderFilter, classId]);

  /* ================= ACTIONS ================= */

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const getStudentFullName = (student: Student) => {
    return `${student.firstName} ${student.middleName ? student.middleName + " " : ""}${student.lastName}`;
  };

  const handleEnroll = async () => {
    if (selectedStudents.size === 0) {
      toast({
        title: "No students selected",
        description: "Please select at least one student to enroll",
        variant: "destructive",
      });
      return;
    }

    // Check capacity
    if (
      classData &&
      classData.currentEnrolled + selectedStudents.size > classData.capacity
    ) {
      toast({
        title: "Capacity Warning",
        description: `Enrolling ${selectedStudents.size} student(s) will exceed class capacity (${classData.currentEnrolled + selectedStudents.size}/${classData.capacity})`,
        variant: "destructive",
      });
      return;
    }

    try {
      setEnrolling(true);
      const token = localStorage.getItem("auth_token");

      const res = await fetch("/api/enrollments/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          classId,
          academicYearId,
        }),
      });

      if (!res.ok) throw new Error("Failed to enroll");

      const result = (await res.json()).data;

      toast({
        title: result.successful > 0 ? "Enrollment Complete" : "Enrollment Failed",
        description: `Successfully enrolled ${result.successful} student(s)${
          result.failed?.length > 0 ? `. Failed: ${result.failed.length}` : ""
        }`,
        variant: result.failed?.length > 0 ? "destructive" : "default",
      });

      if (result.successful > 0) {
        router.push(`/admin/classes/${classId}/students`);
      }
    } catch {
      toast({
        title: "Enrollment failed",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  /* ================= COMPUTED ================= */

  const remainingCapacity = classData
    ? classData.capacity - classData.currentEnrolled
    : 0;
  const willExceedCapacity =
    classData &&
    classData.currentEnrolled + selectedStudents.size > classData.capacity;

  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-36" />
          <div className="text-right space-y-2">
            <Skeleton className="h-7 w-40 ml-auto" />
            <Skeleton className="h-4 w-48 ml-auto" />
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-44" />
          </div>
        </div>
        <div className="border rounded-lg p-6 space-y-3">
          <Skeleton className="h-6 w-48 mb-4" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Classes
          </Button>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold">Enroll Students</h1>
          <p className="text-sm text-muted-foreground">
            {classData
              ? formatCompactClassLabel(classData.grade.name, classData.name)
              : "Select students to enroll"}
          </p>
        </div>
      </div>

      {/* Filters Card with Capacity Info */}
      <Card className="rounded-lg border">
        <CardContent className="py-3">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or student number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={genderFilter}
                onValueChange={(value) =>
                  setGenderFilter(value as Gender | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value={Gender.MALE}>Male</SelectItem>
                  <SelectItem value={Gender.FEMALE}>Female</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={enrollmentFilter}
                onValueChange={(value: any) => setEnrollmentFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Enrollment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="not_enrolled">Not Enrolled</SelectItem>
                  <SelectItem value="enrolled">Already Enrolled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Capacity Info */}
            {classData && (
              <div className="flex items-center gap-3 lg:border-l lg:pl-4">
                <Users className="h-4 w-4 text-primary" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {classData.currentEnrolled} / {classData.capacity}
                  </span>
                  {willExceedCapacity && (
                    <Badge
                      variant="destructive"
                      className="flex items-center gap-1 text-xs"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Exceeds Capacity
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card className="rounded-lg border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available Students ({filteredStudents.length})
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedStudents.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={filteredStudents.length === 0}
              >
                {selectedStudents.size === filteredStudents.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No students found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredStudents.map((student) => {
                const isSelected = selectedStudents.has(student.id);
                const fullName = getStudentFullName(student);
                const initials = `${student.firstName[0]}${student.lastName[0]}`;
                const hasOtherEnrollment =
                  student.enrollments &&
                  student.enrollments.length > 0;

                return (
                  <div
                    key={student.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      isSelected
                        ? "bg-accent border-primary"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleStudent(student.id)}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" alt={fullName} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
                      <p className="font-medium flex-1 min-w-0 truncate">{fullName}</p>
                      <Badge
                        variant="outline"
                        className="capitalize text-xs shrink-0 w-16 justify-center"
                      >
                        {student.gender.toLowerCase()}
                      </Badge>
                      <p className="text-sm text-muted-foreground font-mono shrink-0 w-36">
                        {student.studentNumber}
                      </p>
                      <span className="text-xs text-amber-600 shrink-0 w-56 text-right truncate">
                        {hasOtherEnrollment
                          ? `• Enrolled in ${student.enrollments![0].class.grade.name} ${student.enrollments![0].class.name}`
                          : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t pt-6">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          onClick={handleEnroll}
          disabled={enrolling || selectedStudents.size === 0}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {enrolling
            ? "Enrolling..."
            : `Enroll ${selectedStudents.size} Student${selectedStudents.size !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
