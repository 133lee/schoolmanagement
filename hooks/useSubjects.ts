import { useState, useEffect, useCallback } from "react";
import { Subject } from "@/types/prisma-enums";
import { apiRequest, getAuthToken } from "@/lib/api-client";

/**
 * Subject API Hook
 *
 * Provides methods to interact with the Subject API endpoints.
 * Handles authentication, request/response formatting, and error handling.
 */

interface SubjectFilters {
  departmentId?: string;
  search?: string;
  mode?: "all"; // When set to "all", fetches all subjects without pagination
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface SubjectListResponse {
  data: Subject[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface CreateSubjectInput {
  name: string;
  code: string;
  description?: string;
  departmentId?: string;
}

interface UpdateSubjectInput {
  name?: string;
  code?: string;
  description?: string;
  departmentId?: string;
}

export function useSubjects(
  filters?: SubjectFilters,
  pagination?: PaginationParams
) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch subjects with filters and pagination
   */
  const fetchSubjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();

      if (filters?.departmentId) params.append("departmentId", filters.departmentId);
      if (filters?.search) params.append("search", filters.search);
      if (filters?.mode) params.append("mode", filters.mode);

      // Only add pagination params if mode is not "all"
      if (filters?.mode !== "all") {
        const page = pagination?.page || 1;
        const pageSize = pagination?.pageSize || 10;

        params.append("page", page.toString());
        params.append("pageSize", pageSize.toString());
      }

      const response = await apiRequest<{
        data: Subject[];
        meta: typeof meta;
      }>(`/subjects?${params.toString()}`);

      setSubjects(response.data);
      // Only set meta if it's provided (paginated mode)
      if (response.meta) {
        setMeta(response.meta);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch subjects"
      );
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  /**
   * Get single subject by ID
   */
  const getSubject = useCallback(
    async (id: string, includeRelations = false) => {
      try {
        setIsLoading(true);
        setError(null);

        const endpoint = includeRelations
          ? `/subjects/${id}?include=relations`
          : `/subjects/${id}`;

        const response = await apiRequest<{ data: Subject }>(`${endpoint}`);

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch subject"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Create a new subject
   */
  const createSubject = useCallback(
    async (input: CreateSubjectInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Subject }>(
          `/subjects`,
          {
            method: "POST",
            body: JSON.stringify(input),
          }
        );

        // Refresh the list
        await fetchSubjects();

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create subject"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSubjects]
  );

  /**
   * Update a subject
   */
  const updateSubject = useCallback(
    async (id: string, input: UpdateSubjectInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Subject }>(
          `/subjects/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          }
        );

        // Refresh the list
        await fetchSubjects();

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update subject"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSubjects]
  );

  /**
   * Delete a subject (hard delete - ADMIN only)
   */
  const deleteSubject = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Subject }>(
          `/subjects/${id}`,
          {
            method: "DELETE",
          }
        );

        // Refresh the list
        await fetchSubjects();

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete subject"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSubjects]
  );

  // Fetch subjects on mount and when filters/pagination change
  // Only fetch if authenticated to prevent infinite loops on 401 errors
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      fetchSubjects();
    } else {
      setError("Please login to view subjects");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters?.departmentId,
    filters?.search,
    filters?.mode,
    pagination?.page,
    pagination?.pageSize,
  ]);

  return {
    // State
    subjects,
    meta,
    isLoading,
    error,

    // Methods
    refetch: fetchSubjects,
    getSubject,
    createSubject,
    updateSubject,
    deleteSubject,
  };
}
