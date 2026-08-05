import { useState, useEffect, useCallback } from "react";
import { Term, TermType } from "@/types/prisma-enums";
import { apiRequest, getAuthToken } from "@/lib/api-client";

/**
 * SOURCE OF TRUTH:
 * - Server is authoritative
 * - Local state is optimistic + eventually consistent
 * - Derived values must NOT be stored
 *
 * Term API Hook
 *
 * Provides methods to interact with the Term API endpoints.
 * Handles authentication, request/response formatting, and error handling.
 */

interface TermFilters {
  academicYearId?: string;
  termType?: TermType;
  isActive?: boolean;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface CreateTermInput {
  academicYearId: string;
  termType: TermType;
  startDate: string | Date;
  endDate: string | Date;
}

interface UpdateTermInput {
  startDate?: string | Date;
  endDate?: string | Date;
}

export function useTerms(
  filters?: TermFilters,
  pagination?: PaginationParams
) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch terms with filters and pagination
   */
  const fetchTerms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();

      if (filters?.academicYearId) params.append("academicYearId", filters.academicYearId);
      if (filters?.termType) params.append("termType", filters.termType);
      if (filters?.isActive !== undefined) params.append("isActive", filters.isActive.toString());

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;

      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());

      const response = await apiRequest<{ data: Term[]; meta: typeof meta }>(
        `/terms?${params.toString()}`
      );

      setTerms(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch terms");
      setTerms([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  /**
   * Get single term by ID
   */
  const getTerm = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Term }>(`/terms/${id}`);

        return response.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch term");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Create a new term (Optimistic update)
   */
  const createTerm = useCallback(
    async (input: CreateTermInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Term }>(`/terms`, {
          method: "POST",
          body: JSON.stringify(input),
        });

        // ✅ Optimistic update - add to local state immediately
        setTerms(prev => [response.data, ...prev]);
        setMeta(prev => ({
          ...prev,
          total: prev.total + 1,
          totalPages: Math.ceil((prev.total + 1) / prev.pageSize)
        }));

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create term"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Update a term (Optimistic update)
   */
  const updateTerm = useCallback(
    async (id: string, input: UpdateTermInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Term }>(
          `/terms/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          }
        );

        // ✅ Optimistic update - replace in local state
        setTerms(prev =>
          prev.map(t => t.id === id ? response.data : t)
        );

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update term"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Delete a term (hard delete - ADMIN only) (Optimistic update)
   */
  const deleteTerm = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Term }>(
          `/terms/${id}`,
          {
            method: "DELETE",
          }
        );

        // ✅ Optimistic update - remove from local state
        setTerms(prev => prev.filter(t => t.id !== id));
        setMeta(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          totalPages: Math.ceil(Math.max(0, prev.total - 1) / prev.pageSize)
        }));

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete term"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch terms on mount and when filters/pagination change
  // Only fetch if authenticated to prevent infinite loops on 401 errors
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      fetchTerms();
    } else {
      setError("Please login to view terms");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters?.academicYearId,
    filters?.termType,
    filters?.isActive,
    pagination?.page,
    pagination?.pageSize
  ]);

  return {
    // State
    terms,
    meta,
    isLoading,
    error,

    // Methods
    refetch: fetchTerms,
    getTerm,
    createTerm,
    updateTerm,
    deleteTerm,
  };
}
