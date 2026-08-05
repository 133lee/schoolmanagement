import { useState, useEffect, useCallback } from "react";
import { TeacherProfile, StaffStatus, Gender, QualificationLevel } from "@/types/prisma-enums";
import { apiRequest, getAuthToken } from "@/lib/api-client";

/**
 * HOD Teacher API Hook
 *
 * Provides methods to interact with HOD-specific Teacher API endpoints.
 * Only returns teachers in the HOD's department.
 */

interface TeacherFilters {
  status?: StaffStatus;
  gender?: Gender;
  qualification?: QualificationLevel;
  search?: string;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

export function useHodTeachers(
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
   * Fetch teachers in HOD's department with filters and pagination
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

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 10;

      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());

      const response = await apiRequest<{ data: TeacherProfile[]; meta: typeof meta }>(
        `/hod/teachers?${params.toString()}`
      );

      setTeachers(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch teachers");
      setTeachers([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  // Fetch teachers on mount and when filters/pagination change
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      fetchTeachers();
    } else {
      setError("Please login to view teachers");
      setIsLoading(false);
    }
  }, [filters?.status, filters?.gender, filters?.qualification, filters?.search, pagination?.page, pagination?.pageSize]);

  return {
    teachers,
    meta,
    isLoading,
    error,
    refetch: fetchTeachers,
  };
}
