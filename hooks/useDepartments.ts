import { useState, useEffect, useCallback } from "react";
import { Department, DepartmentStatus } from "@/types/prisma-enums";
import { apiRequest, getAuthToken } from "@/lib/api-client";

/**
 * Department API Hook
 *
 * Provides methods to interact with the Department API endpoints.
 * Handles authentication, request/response formatting, and error handling.
 */

interface DepartmentFilters {
  status?: DepartmentStatus;
  search?: string;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface DepartmentListResponse {
  data: Department[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface CreateDepartmentInput {
  name: string;
  code: string;
  description?: string;
  status?: DepartmentStatus;
}

interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  description?: string;
  status?: DepartmentStatus;
  hodTeacherId?: string | null;
}

export function useDepartments(
  filters?: DepartmentFilters,
  pagination?: PaginationParams
) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch departments with filters and pagination
   */
  const fetchDepartments = useCallback(async () => {
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
        data: Department[];
        meta: typeof meta;
      }>(`/departments?${params.toString()}`);

      console.log("[HOOK] useDepartments received data - HOD info:", response.data.map((d: any) => ({
        departmentId: d.id,
        departmentName: d.name,
        hodTeacherId: d.hodTeacherId,
        hod: d.hod,
      })));

      setDepartments(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch departments"
      );
      setDepartments([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  /**
   * Get single department by ID
   */
  const getDepartment = useCallback(
    async (id: string, includeRelations = false) => {
      try {
        setIsLoading(true);
        setError(null);

        const endpoint = includeRelations
          ? `/departments/${id}?include=relations`
          : `/departments/${id}`;

        const response = await apiRequest<{ data: Department }>(`${endpoint}`);

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch department"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Create a new department
   */
  const createDepartment = useCallback(
    async (input: CreateDepartmentInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Department }>(
          `/departments`,
          {
            method: "POST",
            body: JSON.stringify(input),
          }
        );

        // Refresh the list
        await fetchDepartments();

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create department"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchDepartments]
  );

  /**
   * Update a department
   */
  const updateDepartment = useCallback(
    async (id: string, input: UpdateDepartmentInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Department }>(
          `/departments/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          }
        );

        // Refresh the list
        await fetchDepartments();

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update department"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchDepartments]
  );

  /**
   * Change department status
   */
  const changeDepartmentStatus = useCallback(
    async (id: string, status: DepartmentStatus) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Department }>(
          `/departments/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          }
        );

        // Refresh the list
        await fetchDepartments();

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to change department status"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchDepartments]
  );

  /**
   * Delete a department (hard delete - ADMIN only)
   */
  const deleteDepartment = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: Department }>(
          `/departments/${id}`,
          {
            method: "DELETE",
          }
        );

        // Refresh the list
        await fetchDepartments();

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete department"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchDepartments]
  );

  // Fetch departments on mount and when filters/pagination change
  // Only fetch if authenticated to prevent infinite loops on 401 errors
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      fetchDepartments();
    } else {
      setError("Please login to view departments");
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
    departments,
    meta,
    isLoading,
    error,

    // Methods
    refetch: fetchDepartments,
    getDepartment,
    createDepartment,
    updateDepartment,
    changeDepartmentStatus,
    deleteDepartment,
  };
}
