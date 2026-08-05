import { useState, useEffect, useCallback } from "react";
import { TeacherProfile, StaffStatus, Gender, QualificationLevel } from "@/types/prisma-enums";
import { apiRequest, getAuthToken } from "@/lib/api-client";

/**
 * SOURCE OF TRUTH:
 * - Server is authoritative
 * - Local state is optimistic + eventually consistent
 * - Derived values must NOT be stored
 *
 * Teacher API Hook
 *
 * Provides methods to interact with the Teacher API endpoints.
 * Handles authentication, request/response formatting, and error handling.
 */

interface TeacherFilters {
  status?: StaffStatus;
  gender?: Gender;
  qualification?: QualificationLevel;
  search?: string;
  mode?: "all"; // When set to "all", fetches all teachers without pagination
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface CreateTeacherInput {
  userId: string;
  staffNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string | Date;
  gender: Gender;
  phone: string;
  address?: string;
  qualification: QualificationLevel;
  yearsExperience?: number;
  status?: StaffStatus;
  hireDate: string | Date;
}

interface UpdateTeacherInput {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string | Date;
  gender?: Gender;
  phone?: string;
  address?: string;
  qualification?: QualificationLevel;
  yearsExperience?: number;
}

export function useTeachers(
  filters?: TeacherFilters,
  pagination?: PaginationParams
) {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch teachers with filters and pagination
   */
  const fetchTeachers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();

      if (filters?.status) params.append("status", filters.status);
      if (filters?.gender) params.append("gender", filters.gender);
      if (filters?.qualification) params.append("qualification", filters.qualification);
      if (filters?.search) params.append("search", filters.search);
      if (filters?.mode) params.append("mode", filters.mode);

      // Only add pagination params if mode is not "all"
      if (filters?.mode !== "all") {
        const page = pagination?.page || 1;
        const pageSize = pagination?.pageSize || 10;

        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());
      }

      const response = await apiRequest<{ data: TeacherProfile[]; meta: typeof meta }>(
        `/teachers?${params.toString()}`
      );

      setTeachers(response.data);
      // Only set meta if it's provided (paginated mode)
      if (response.meta) {
        setMeta(response.meta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch teachers");
      setTeachers([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  /**
   * Get single teacher by ID
   */
  const getTeacher = useCallback(
    async (id: string, includeRelations = false) => {
      try {
        setIsLoading(true);
        setError(null);

        const endpoint = includeRelations
          ? `/teachers/${id}?include=relations`
          : `/teachers/${id}`;

        const response = await apiRequest<{ data: TeacherProfile }>(`${endpoint}`);

        return response.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch teacher");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Create a new teacher (Optimistic update)
   */
  const createTeacher = useCallback(
    async (input: CreateTeacherInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: TeacherProfile }>(`/teachers`, {
          method: "POST",
          body: JSON.stringify(input),
        });

        // ✅ Optimistic update - add to local state immediately
        setTeachers(prev => [response.data, ...prev]);
        setMeta(prev => ({
          ...prev,
          total: prev.total + 1,
          totalPages: Math.ceil((prev.total + 1) / prev.pageSize)
        }));

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create teacher"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [] // No dependencies - don't need fetchTeachers
  );

  /**
   * Update a teacher (Optimistic update)
   */
  const updateTeacher = useCallback(
    async (id: string, input: UpdateTeacherInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: TeacherProfile }>(
          `/teachers/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          }
        );

        // ✅ Optimistic update - replace in local state
        setTeachers(prev =>
          prev.map(t => t.id === id ? response.data : t)
        );

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update teacher"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Change teacher status (Optimistic update)
   */
  const changeTeacherStatus = useCallback(
    async (id: string, status: StaffStatus) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: TeacherProfile }>(
          `/teachers/${id}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          }
        );

        // ✅ Optimistic update - update in local state
        setTeachers(prev =>
          prev.map(t => t.id === id ? response.data : t)
        );

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to change teacher status"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Retire a teacher (Optimistic update)
   */
  const retireTeacher = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: TeacherProfile }>(
          `/teachers/${id}/retire`,
          {
            method: "POST",
          }
        );

        // ✅ Optimistic update - update in local state
        setTeachers(prev =>
          prev.map(t => t.id === id ? response.data : t)
        );

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to retire teacher"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Terminate a teacher (Optimistic update)
   */
  const terminateTeacher = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: TeacherProfile }>(
          `/teachers/${id}/terminate`,
          {
            method: "POST",
          }
        );

        // ✅ Optimistic update - update in local state
        setTeachers(prev =>
          prev.map(t => t.id === id ? response.data : t)
        );

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to terminate teacher"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Delete a teacher (hard delete - ADMIN only) (Optimistic update)
   */
  const deleteTeacher = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: TeacherProfile }>(
          `/teachers/${id}`,
          {
            method: "DELETE",
          }
        );

        // ✅ Optimistic update - remove from local state
        setTeachers(prev => prev.filter(t => t.id !== id));
        setMeta(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          totalPages: Math.ceil(Math.max(0, prev.total - 1) / prev.pageSize)
        }));

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete teacher"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch teachers on mount and when filters/pagination change
  // Only fetch if authenticated to prevent infinite loops on 401 errors
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      fetchTeachers();
    } else {
      setError("Please login to view teachers");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.status, filters?.gender, filters?.qualification, filters?.search, filters?.mode, pagination?.page, pagination?.pageSize]);

  return {
    // State
    teachers,
    meta,
    isLoading,
    error,

    // Methods
    refetch: fetchTeachers,
    getTeacher,
    createTeacher,
    updateTeacher,
    changeTeacherStatus,
    retireTeacher,
    terminateTeacher,
    deleteTeacher,
  };
}
