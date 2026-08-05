"use client";

import { useState, useEffect, useMemo } from "react";
import { formatClassLabel } from "@/lib/utils";
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
import { ChevronLeft, Search, UserPlus, Users, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Gender } from "@/types/prisma-enums";

/**
 * HOD Enroll Students Page
 * Bulk enroll students into a secondary class (Grades 8-12)
 */

interface Student {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  studentNumber: string;
  gender: string;
  status: string;
  enrollments?: Array<{
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
  grade: {
    id: string;
    name: string;
  };
}

export default function HodEnrollStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;
  const { toast } = useToast();

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [academicYearId, setAcademicYearId] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<Gender | "all">("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState<"all" | "enrolled" | "not_enrolled">("not_enrolled");

  // Fetch class data
  useEffect(() => {
    const fetchClass = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch(`/api/classes/${classId}?include=relations`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setClassData(result.data);
        }
      } catch (error) {
        console.error("Error fetching class:", error);
      }
    };
    fetchClass();
  }, [classId]);

  // Fetch active academic year
  useEffect(() => {
    const fetchActiveYear = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const response = await fetch("/api/academic-years/active", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setAcademicYearId(data.data.id);
        }
      } catch (error) {
        console.error("Error fetching active year:", error);
      }
    };
    fetchActiveYear();
  }, []);

  // Fetch available students with enrollments
  useEffect(() => {
    if (academicYearId) {
      fetchAvailableStudents();
    }
  }, [academicYearId]);

  const fetchAvailableStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/students?includeEnrollments=true&mode=all&academicYearId=${academicYearId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      // Filter only active students
      const activeStudents = (data.data || []).filter(
        (s: Student) => s.status === "ACTIVE"
      );
      setStudents(activeStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Search filter
      if (search) {
        const fullName = `${student.firstName} ${student.middleName || ""} ${student.lastName}`.toLowerCase();
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

      // Enrollment filter
      const hasEnrollment = student.enrollments && student.enrollments.length > 0;
      const isEnrolledInThisClass = student.enrollments?.some(
        (e) => e.class.id === classId
      );

      if (enrollmentFilter === "not_enrolled" && hasEnrollment) {
        return false;
      }
      if (enrollmentFilter === "enrolled" && !hasEnrollment) {
        return false;
      }

      // Don't show students already enrolled in this class
      if (isEnrolledInThisClass) {
        return false;
      }

      return true;
    });
  }, [students, search, genderFilter, enrollmentFilter, classId]);

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const selectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
    }
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
    if (classData && classData.currentEnrolled + selectedStudents.size > classData.capacity) {
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
      const response = await fetch("/api/enrollments/bulk", {
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

      if (!response.ok) throw new Error("Failed to enroll");

      const result = (await response.json()).data;

      // Log detailed error information for debugging
      if (result.failed && result.failed.length > 0) {
        console.error("Enrollment failures:", result.failed);
        result.failed.forEach((failure: { studentId: string; error: string }) => {
          console.error(`Student ${failure.studentId}: ${failure.error}`);
        });
      }

      toast({
        title: result.successful > 0 ? "Enrollment Complete" : "Enrollment Failed",
        description: `Successfully enrolled ${result.successful} student(s)${
          result.failed.length > 0 ? `. Failed: ${result.failed.length}` : ""
        }`,
        variant: result.failed.length > 0 ? "destructive" : "default",
      });

      // Navigate back to HOD classes page on success
      if (result.successful > 0) {
        router.push("/hod/classes");
      }
    } catch (error) {
      console.error("Error enrolling students:", error);
      toast({
        title: "Error",
        description: "Failed to enroll students",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const getStudentFullName = (student: Student) => {
    return `${student.firstName} ${student.middleName ? student.middleName + " " : ""}${student.lastName}`;
  };

  const remainingCapacity = classData
    ? classData.capacity - classData.currentEnrolled
    : 0;
  const willExceedCapacity =
    classData && classData.currentEnrolled + selectedStudents.size > classData.capacity;

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-36" />
          <div className="text-right space-y-1">
            <Skeleton className="h-7 w-44 ml-auto" />
            <Skeleton className="h-4 w-28 ml-auto" />
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex gap-3">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-44" />
          </div>
        </div>
        <div className="border rounded-lg p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-28" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
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
            {classData ? formatClassLabel(classData.grade.name, classData.name) : "Select students to enroll"}
          </p>
        </div>
      </div>

      {/* Filters Card with Capacity Info */}
      <Card>
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
                onValueChange={(value) => setGenderFilter(value as Gender | "all")}
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
            {classData && classData.currentEnrolled > 0 && (
              <div className="flex items-center gap-3 lg:border-l lg:pl-4">
                <Users className="h-4 w-4 text-primary" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {classData.currentEnrolled} / {classData.capacity}
                  </span>
                  {willExceedCapacity && (
                    <Badge variant="destructive" className="flex items-center gap-1 text-xs">
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
      <Card>
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
                {selectedStudents.size === filteredStudents.length ? "Deselect All" : "Select All"}
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
                const hasOtherEnrollment = student.enrollments && student.enrollments.length > 0;

                return (
                  <div
                    key={student.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                      isSelected ? "bg-accent border-primary" : "hover:bg-muted/50"
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
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{fullName}</p>
                        <Badge variant="outline" className="capitalize text-xs">
                          {student.gender.toLowerCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-muted-foreground font-mono">
                          {student.studentNumber}
                        </p>
                        {hasOtherEnrollment && (
                          <span className="text-xs text-amber-600">
                            • Enrolled in {formatClassLabel(student.enrollments![0].class.grade.name, student.enrollments![0].class.name)}
                          </span>
                        )}
                      </div>
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
