import { useState, useEffect, useCallback } from "react";
import { AcademicYear } from "@/types/prisma-enums";
import { apiRequest, getAuthToken } from "@/lib/api-client";

/**
 * SOURCE OF TRUTH:
 * - Server is authoritative
 * - Local state is optimistic + eventually consistent
 * - Derived values must NOT be stored
 *
 * AcademicYear API Hook
 *
 * Provides methods to interact with the AcademicYear API endpoints.
 * Handles authentication, request/response formatting, and error handling.
 */

interface AcademicYearFilters {
  isActive?: boolean;
  isClosed?: boolean;
  search?: string;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface CreateAcademicYearInput {
  year: number;
  startDate: string | Date;
  endDate: string | Date;
}

interface UpdateAcademicYearInput {
  year?: number;
  startDate?: string | Date;
  endDate?: string | Date;
}

export function useAcademicYears(
  filters?: AcademicYearFilters,
  pagination?: PaginationParams
) {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch academic years with filters and pagination
   */
  const fetchAcademicYears = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();

      if (filters?.isActive !== undefined) params.append("isActive", filters.isActive.toString());
      if (filters?.isClosed !== undefined) params.append("isClosed", filters.isClosed.toString());
      if (filters?.search) params.append("search", filters.search);

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;

      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());

      const response = await apiRequest<{ data: AcademicYear[]; meta: typeof meta }>(
        `/academic-years?${params.toString()}`
      );

      setAcademicYears(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch academic years");
      setAcademicYears([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  /**
   * Get single academic year by ID
   */
  const getAcademicYear = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: AcademicYear }>(`/academic-years/${id}`);

        return response.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch academic year");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Create a new academic year (Optimistic update)
   */
  const createAcademicYear = useCallback(
    async (input: CreateAcademicYearInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: AcademicYear }>(`/academic-years`, {
          method: "POST",
          body: JSON.stringify(input),
        });

        // ✅ Optimistic update - add to local state immediately
        setAcademicYears(prev => [response.data, ...prev]);
        setMeta(prev => ({
          ...prev,
          total: prev.total + 1,
          totalPages: Math.ceil((prev.total + 1) / prev.pageSize)
        }));

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create academic year"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Update an academic year (Optimistic update)
   */
  const updateAcademicYear = useCallback(
    async (id: string, input: UpdateAcademicYearInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: AcademicYear }>(
          `/academic-years/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          }
        );

        // ✅ Optimistic update - replace in local state
        setAcademicYears(prev =>
          prev.map(ay => ay.id === id ? response.data : ay)
        );

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update academic year"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Delete an academic year (hard delete - ADMIN only) (Optimistic update)
   */
  const deleteAcademicYear = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: AcademicYear }>(
          `/academic-years/${id}`,
          {
            method: "DELETE",
          }
        );

        // ✅ Optimistic update - remove from local state
        setAcademicYears(prev => prev.filter(ay => ay.id !== id));
        setMeta(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          totalPages: Math.ceil(Math.max(0, prev.total - 1) / prev.pageSize)
        }));

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete academic year"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch academic years on mount and when filters/pagination change
  // Only fetch if authenticated to prevent infinite loops on 401 errors
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      fetchAcademicYears();
    } else {
      setError("Please login to view academic years");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters?.isActive,
    filters?.isClosed,
    filters?.search,
    pagination?.page,
    pagination?.pageSize
  ]);

  return {
    // State
    academicYears,
    meta,
    isLoading,
    error,

    // Methods
    refetch: fetchAcademicYears,
    getAcademicYear,
    createAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
  };
}
