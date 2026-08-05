import { useState, useEffect, useCallback } from "react";
import { Guardian, ParentStatus, VulnerabilityStatus } from "@/types/prisma-enums";
import { apiRequest, getAuthToken } from "@/lib/api-client";

/**
 * Parent/Guardian API Hook
 *
 * Provides methods to interact with the Parent/Guardian API endpoints.
 * Handles authentication, request/response formatting, and error handling.
 */

interface ParentFilters {
  status?: ParentStatus;
  search?: string;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface ParentListResponse {
  data: Guardian[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface CreateParentInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  occupation?: string;
  status?: ParentStatus;
  vulnerability?: VulnerabilityStatus;
}

interface UpdateParentInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  occupation?: string;
  status?: ParentStatus;
  vulnerability?: VulnerabilityStatus;
}

export function useParents(
  filters?: ParentFilters,
  pagination?: PaginationParams
) {
  const [parents, setParents] = useState<Guardian[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch parents with filters and pagination
   */
  const fetchParents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();

      if (filters?.status) params.append("status", filters.status);
      if (filters?.search) params.append("search", filters.search);

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 10;

      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());

      const response = await apiRequest<{
        data: Guardian[];
        meta: typeof meta;
      }>(`/parents?${params.toString()}`);

      setParents(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch parents"
      );
      setParents([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  /**
   * Get single parent by ID
   */
  const getParent = useCallback(
    async (id: string, includeRelations = false) => {
      try {
        setIsLoading(true);
        setError(null);

        const endpoint = includeRelations
          ? `/parents/${id}?include=relations`
          : `/parents/${id}`;

        const response = await apiRequest<{ data: Guardian }>(`${endpoint}`);

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch parent"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Create a new parent
   */
  const createParent = useCallback(
    async (input: CreateParentInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Guardian }>(
          `/parents`,
          {
            method: "POST",
            body: JSON.stringify(input),
          }
        );

        // Refresh the list
        await fetchParents();

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create parent"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchParents]
  );

  /**
   * Update a parent
   */
  const updateParent = useCallback(
    async (id: string, input: UpdateParentInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Guardian }>(
          `/parents/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          }
        );

        // Refresh the list
        await fetchParents();

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update parent"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchParents]
  );

  /**
   * Change parent status
   */
  const changeParentStatus = useCallback(
    async (id: string, status: ParentStatus) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Guardian }>(
          `/parents/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          }
        );

        // Refresh the list
        await fetchParents();

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to change parent status"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchParents]
  );

  /**
   * Delete a parent (hard delete - ADMIN only)
   */
  const deleteParent = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Guardian }>(
          `/parents/${id}`,
          {
            method: "DELETE",
          }
        );

        // Refresh the list
        await fetchParents();

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete parent"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchParents]
  );

  // Fetch parents on mount and when filters/pagination change
  // Only fetch if authenticated to prevent infinite loops on 401 errors
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      fetchParents();
    } else {
      setError("Please login to view parents");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters?.status,
    filters?.search,
    pagination?.page,
    pagination?.pageSize,
  ]);

  return {
    // State
    parents,
    meta,
    isLoading,
    error,

    // Methods
    refetch: fetchParents,
    getParent,
    createParent,
    updateParent,
    changeParentStatus,
    deleteParent,
  };
}
