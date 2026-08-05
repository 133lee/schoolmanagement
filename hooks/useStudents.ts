import { useState, useEffect, useCallback } from "react";
import { Student, StudentStatus, Gender } from "@/types/prisma-enums";
import { apiRequest, getAuthToken } from "@/lib/api-client";

/**
 * SOURCE OF TRUTH:
 * - Server is authoritative
 * - Local state is optimistic + eventually consistent
 * - Derived values must NOT be stored
 *
 * Student API Hook
 *
 * Provides methods to interact with the Student API endpoints.
 * Handles authentication, request/response formatting, and error handling.
 */

interface StudentFilters {
  status?: StudentStatus;
  gender?: Gender;
  search?: string;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface StudentListResponse {
  data: Student[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface CreateStudentInput {
  studentNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string | Date;
  gender: Gender;
  admissionDate: string | Date;
  status?: StudentStatus;
  address?: string;
  medicalInfo?: string;
}

interface UpdateStudentInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string | Date;
  gender?: Gender;
  address?: string;
  medicalInfo?: string;
}

export function useStudents(
  filters?: StudentFilters,
  pagination?: PaginationParams
) {
  const [students, setStudents] = useState<Student[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch students with filters and pagination
   */
  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();

      if (filters?.status) params.append("status", filters.status);
      if (filters?.gender) params.append("gender", filters.gender);
      if (filters?.search) params.append("search", filters.search);

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 10;

      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());

      const response = await apiRequest<{ data: Student[]; meta: typeof meta }>(
        `/students?${params.toString()}`
      );

      setStudents(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch students");
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  /**
   * Get single student by ID
   */
  const getStudent = useCallback(
    async (id: string, includeRelations = false) => {
      try {
        setIsLoading(true);
        setError(null);

        const endpoint = includeRelations
          ? `/students/${id}?include=relations`
          : `/students/${id}`;

        const response = await apiRequest<{ data: Student }>(`${endpoint}`);

        return response.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch student");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Create a new student (Optimistic update)
   */
  const createStudent = useCallback(
    async (input: CreateStudentInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Student }>(`/students`, {
          method: "POST",
          body: JSON.stringify(input),
        });

        // ✅ Optimistic update - add to local state immediately
        setStudents(prev => [response.data, ...prev]);
        setMeta(prev => ({
          ...prev,
          total: prev.total + 1,
          totalPages: Math.ceil((prev.total + 1) / prev.pageSize)
        }));

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create student"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [] // No dependencies - don't need fetchStudents
  );

  /**
   * Update a student (Optimistic update)
   */
  const updateStudent = useCallback(
    async (id: string, input: UpdateStudentInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Student }>(
          `/students/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          }
        );

        // ✅ Optimistic update - replace in local state
        setStudents(prev =>
          prev.map(s => s.id === id ? response.data : s)
        );

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update student"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Change student status (Optimistic update)
   */
  const changeStudentStatus = useCallback(
    async (id: string, status: StudentStatus) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Student }>(
          `/students/${id}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          }
        );

        // ✅ Optimistic update - update in local state
        setStudents(prev =>
          prev.map(s => s.id === id ? response.data : s)
        );

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to change student status"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Withdraw a student (Optimistic update)
   */
  const withdrawStudent = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Student }>(
          `/students/${id}/withdraw`,
          {
            method: "POST",
          }
        );

        // ✅ Optimistic update - update in local state
        setStudents(prev =>
          prev.map(s => s.id === id ? response.data : s)
        );

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to withdraw student"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Delete a student (hard delete - ADMIN only) (Optimistic update)
   */
  const deleteStudent = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Student }>(
          `/students/${id}`,
          {
            method: "DELETE",
          }
        );

        // ✅ Optimistic update - remove from local state
        setStudents(prev => prev.filter(s => s.id !== id));
        setMeta(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          totalPages: Math.ceil(Math.max(0, prev.total - 1) / prev.pageSize)
        }));

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete student"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch students on mount and when filters/pagination change
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
  }, [filters?.status, filters?.gender, filters?.search, pagination?.page, pagination?.pageSize]);

  return {
    // State
    students,
    meta,
    isLoading,
    error,

    // Methods
    refetch: fetchStudents,
    getStudent,
    createStudent,
    updateStudent,
    changeStudentStatus,
    withdrawStudent,
    deleteStudent,
  };
}
