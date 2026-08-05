import { useState, useEffect, useCallback } from "react";
import { Gender, StudentStatus, VulnerabilityStatus } from "@/types/prisma-enums";
import { apiRequest, getAuthToken } from "@/lib/api-client";

/**
 * Teacher Students API Hook
 *
 * Provides methods to interact with teacher-specific student endpoints.
 * Handles authentication, request/response formatting, and error handling.
 */

interface Student {
  id: string;
  studentNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: Date;
  status: StudentStatus;
  vulnerability: VulnerabilityStatus | null;
  hasGuardian: boolean;
  guardianName: string | null;
}

interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  gradeLevel: string;
  subject?: string;
  subjectCode?: string;
  capacity: number;
  enrolled: number;
  students?: Student[];
}

interface ClassTeacherData {
  view: "class-teacher";
  class: ClassInfo | null;
  students: Student[];
}

interface SubjectTeacherData {
  view: "subject-teacher";
  classes: ClassInfo[];
  selectedClassId: string | null;
}

type TeacherStudentsData = ClassTeacherData | SubjectTeacherData;

interface StudentFilters {
  gender?: Gender;
  status?: StudentStatus;
  search?: string;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

export function useTeacherStudents(
  view: "class-teacher" | "subject-teacher" = "class-teacher",
  classId?: string | null,
  filters?: StudentFilters,
  pagination?: PaginationParams
) {
  const [data, setData] = useState<TeacherStudentsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch teacher's students with filters
   */
  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      params.append("view", view);

      if (classId) {
        params.append("classId", classId);
      }

      if (filters?.gender) params.append("gender", filters.gender);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.search) params.append("search", filters.search);

      if (pagination) {
        params.append("page", pagination.page.toString());
        params.append("pageSize", pagination.pageSize.toString());
      }

      const response = await apiRequest<TeacherStudentsData>(
        `/teacher/students?${params.toString()}`
      );

      // Empty data is OK, not an error
      setData((response as any).data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch students";
      // Only set error if it's an actual error (not empty data)
      if (!errorMessage.includes("no students") && !errorMessage.includes("not assigned")) {
        setError(errorMessage);
      } else {
        // Empty state, not an error
        setError(null);
      }
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [view, classId, filters, pagination]);

  /**
   * Get filtered students from current data
   */
  const getFilteredStudents = useCallback((): Student[] => {
    if (!data) return [];

    let students: Student[] = [];

    if (data.view === "class-teacher") {
      students = data.students || [];
    } else if (data.view === "subject-teacher") {
      if (classId) {
        const selectedClass = data.classes.find((c) => c.id === classId);
        students = selectedClass?.students || [];
      } else {
        // Show all students from all classes
        students = data.classes.flatMap((c) => c.students || []);
      }
    }

    // Apply client-side filters
    return students.filter((student) => {
      const matchesSearch =
        !filters?.search ||
        student.fullName.toLowerCase().includes(filters.search.toLowerCase()) ||
        student.studentNumber.toLowerCase().includes(filters.search.toLowerCase());

      const matchesGender =
        !filters?.gender || student.gender === filters.gender;

      const matchesStatus =
        !filters?.status || student.status === filters.status;

      return matchesSearch && matchesGender && matchesStatus;
    });
  }, [data, classId, filters]);

  // Fetch students on mount and when dependencies change
  // Only fetch if authenticated to prevent infinite loops on 401 errors
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      fetchStudents();
    } else {
      setError("Please login to view students");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, classId, pagination?.page, pagination?.pageSize]);

  return {
    // State
    data,
    isLoading,
    error,

    // Methods
    refetch: fetchStudents,
    getFilteredStudents,
  };
}
