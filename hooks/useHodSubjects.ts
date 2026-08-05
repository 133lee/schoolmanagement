import { useState, useEffect, useCallback } from "react";
import { apiRequest, getAuthToken } from "@/lib/api-client";

/**
 * HOD Subject API Hook
 *
 * Provides methods to interact with HOD-specific Subject API endpoints.
 * Only returns subjects assigned to the HOD's department.
 */

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  departmentId?: string;
  department?: {
    id: string;
    name: string;
  } | null;
  teacherSubjects?: Array<{
    teacher: Teacher;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

export function useHodSubjects(
  search?: string,
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
   * Fetch subjects in HOD's department with pagination
   */
  const fetchSubjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 10;

      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());

      const response = await apiRequest<{ data: Subject[]; meta: typeof meta }>(
        `/hod/subjects?${params.toString()}`
      );

      setSubjects(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch subjects");
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, pagination]);

  // Fetch subjects on mount and when filters/pagination change
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      fetchSubjects();
    } else {
      setError("Please login to view subjects");
      setIsLoading(false);
    }
  }, [search, pagination?.page, pagination?.pageSize]);

  return {
    subjects,
    meta,
    isLoading,
    error,
    refetch: fetchSubjects,
  };
}
