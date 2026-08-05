import { useState, useEffect, useCallback } from "react";
import { Class, ClassStatus } from "@/types/prisma-enums";
import { apiRequest, getAuthToken } from "@/lib/api-client";
import { invalidationBus } from "@/lib/invalidation";

/**
 * SOURCE OF TRUTH:
 * - Server is authoritative
 * - Local state is optimistic + eventually consistent
 * - Derived values must NOT be stored
 *
 * Class API Hook
 *
 * Provides methods to interact with the Class API endpoints.
 * Handles authentication, request/response formatting, and error handling.
 */

interface ClassFilters {
  status?: ClassStatus;
  gradeId?: string;
  search?: string;
  mode?: "all"; // When set to "all", fetches all classes without pagination
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface CreateClassInput {
  gradeId: string;
  name: string;
  capacity?: number;
  status?: ClassStatus;
}

interface UpdateClassInput {
  name?: string;
  capacity?: number;
  status?: ClassStatus;
}

export function useClasses(
  filters?: ClassFilters,
  pagination?: PaginationParams
) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch classes with filters and pagination
   */
  const fetchClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();

      if (filters?.status) params.append("status", filters.status);
      if (filters?.gradeId) params.append("gradeId", filters.gradeId);
      if (filters?.search) params.append("search", filters.search);
      if (filters?.mode) params.append("mode", filters.mode);

      // Only add pagination params if mode is not "all"
      if (filters?.mode !== "all") {
        const page = pagination?.page || 1;
        const pageSize = pagination?.pageSize || 10;

        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());
      }

      const response = await apiRequest<{ data: Class[]; meta: typeof meta }>(
        `/classes?${params.toString()}`
      );

      setClasses(response.data);
      // Only set meta if it's provided (paginated mode)
      if (response.meta) {
        setMeta(response.meta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch classes");
      setClasses([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  /**
   * Get single class by ID
   */
  const getClass = useCallback(async (id: string, includeRelations = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const endpoint = includeRelations
        ? `/classes/${id}?include=relations`
        : `/classes/${id}`;

      const response = await apiRequest<{ data: Class }>(`${endpoint}`);

      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch class");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new class (Optimistic update)
   */
  const createClass = useCallback(
    async (input: CreateClassInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Class }>(`/classes`, {
          method: "POST",
          body: JSON.stringify(input),
        });

        // ✅ Optimistic update - add to local state immediately
        setClasses((prev) => [response.data, ...prev]);
        setMeta((prev) => ({
          ...prev,
          total: prev.total + 1,
          totalPages: Math.ceil((prev.total + 1) / prev.pageSize),
        }));

        return response.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create class");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [] // No dependencies - don't need fetchClasses
  );

  /**
   * Update a class (Optimistic update)
   */
  const updateClass = useCallback(
    async (id: string, input: UpdateClassInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Class }>(`/classes/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        });

        // ✅ Optimistic update - replace in local state
        setClasses((prev) =>
          prev.map((c) => (c.id === id ? response.data : c))
        );

        return response.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update class");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Change class status (Optimistic update)
   */
  const changeClassStatus = useCallback(
    async (id: string, status: ClassStatus) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Class }>(`/classes/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });

        // ✅ Optimistic update - update in local state
        setClasses((prev) =>
          prev.map((c) => (c.id === id ? response.data : c))
        );

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to change class status"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Delete a class (hard delete - ADMIN only) (Optimistic update)
   */
  const deleteClass = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiRequest<{ data: Class }>(`/classes/${id}`, {
        method: "DELETE",
      });

      // ✅ Optimistic update - remove from local state
      setClasses((prev) => prev.filter((c) => c.id !== id));
      setMeta((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        totalPages: Math.ceil(Math.max(0, prev.total - 1) / prev.pageSize),
      }));

      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete class");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Assign or reassign class teacher
   * For PRIMARY grades (1-7), also auto-assigns teacher to all subjects
   *
   * Invalidates: 'classes', 'teachers', 'teacher-classes'
   */
  const assignClassTeacher = useCallback(
    async (classId: string, teacherId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        await apiRequest<{ data: { success: boolean } }>(
          `/classes/${classId}/class-teacher`,
          {
            method: "POST",
            body: JSON.stringify({ teacherId }),
          }
        );

        // Refresh the list to get updated data (complex operation, needs full refetch)
        await fetchClasses();

        // Signal invalidation (AFTER successful mutation)
        invalidationBus.invalidate("classes", "teachers", "teacher-classes");

        return { success: true };
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to assign class teacher"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchClasses]
  );

  /**
   * Remove class teacher assignment
   * For PRIMARY grades (1-7), also removes all subject assignments
   *
   * Invalidates: 'classes', 'teachers', 'teacher-classes'
   */
  const removeClassTeacher = useCallback(
    async (classId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        await apiRequest<{ data: { success: boolean } }>(
          `/classes/${classId}/class-teacher`,
          {
            method: "DELETE",
          }
        );

        // Refresh the list to get updated data (complex operation, needs full refetch)
        await fetchClasses();

        // Signal invalidation (AFTER successful mutation)
        invalidationBus.invalidate("classes", "teachers", "teacher-classes");

        return { success: true };
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove class teacher"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchClasses]
  );

  // Fetch classes on mount and when filters/pagination change
  // Only fetch if authenticated to prevent infinite loops on 401 errors
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      fetchClasses();
    } else {
      setError("Please login to view classes");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters?.status,
    filters?.gradeId,
    filters?.search,
    filters?.mode,
    pagination?.page,
    pagination?.pageSize,
  ]);

  return {
    // State
    classes,
    meta,
    isLoading,
    error,

    // Methods
    refetch: fetchClasses,
    getClass,
    createClass,
    updateClass,
    changeClassStatus,
    deleteClass,
    assignClassTeacher,
    removeClassTeacher,
  };
}
