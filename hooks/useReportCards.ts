import { useState, useEffect, useCallback } from "react";
import { ReportCard, PromotionStatus } from "@/types/prisma-enums";
import { apiRequest, getAuthToken } from "@/lib/api-client";

/**
 * SOURCE OF TRUTH:
 * - Server is authoritative
 * - Local state is optimistic + eventually consistent
 * - Derived values must NOT be stored
 *
 * ReportCard API Hook
 *
 * Provides methods to interact with the ReportCard API endpoints.
 * Handles authentication, request/response formatting, and error handling.
 */

interface ReportCardFilters {
  studentId?: string;
  classId?: string;
  termId?: string;
  academicYearId?: string;
  promotionStatus?: PromotionStatus;
}

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface GenerateReportCardInput {
  studentId: string;
  classId: string;
  termId: string;
  classTeacherId: string;
}

interface BulkGenerateInput {
  classId: string;
  termId: string;
  classTeacherId: string;
}

interface UpdateReportCardInput {
  classTeacherRemarks?: string;
  headTeacherRemarks?: string;
  promotionStatus?: PromotionStatus;
  nextGrade?: string;
}

interface CalculatePositionsInput {
  classId: string;
  termId: string;
}

export function useReportCards(
  filters?: ReportCardFilters,
  pagination?: PaginationParams
) {
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch report cards with filters and pagination
   */
  const fetchReportCards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();

      if (filters?.studentId) params.append("studentId", filters.studentId);
      if (filters?.classId) params.append("classId", filters.classId);
      if (filters?.termId) params.append("termId", filters.termId);
      if (filters?.academicYearId) params.append("academicYearId", filters.academicYearId);
      if (filters?.promotionStatus) params.append("promotionStatus", filters.promotionStatus);

      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 10;

      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());

      const response = await apiRequest<{ data: ReportCard[]; meta: typeof meta }>(
        `/report-cards?${params.toString()}`
      );

      setReportCards(response.data);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch report cards");
      setReportCards([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  /**
   * Get single report card by ID with relations
   */
  const getReportCard = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: ReportCard }>(`/report-cards/${id}`);

        return response.data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch report card");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Generate a report card for a student (Optimistic update)
   */
  const generateReportCard = useCallback(
    async (input: GenerateReportCardInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: ReportCard }>(`/report-cards`, {
          method: "POST",
          body: JSON.stringify(input),
        });

        // ✅ Optimistic update - add to local state immediately
        setReportCards(prev => [response.data, ...prev]);
        setMeta(prev => ({
          ...prev,
          total: prev.total + 1,
          totalPages: Math.ceil((prev.total + 1) / prev.pageSize)
        }));

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate report card"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Bulk generate report cards for an entire class
   */
  const bulkGenerateReportCards = useCallback(
    async (input: BulkGenerateInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{
          data: { successful: number; failed: Array<{ studentId: string; error: string }> };
        }>(`/report-cards/bulk`, {
          method: "POST",
          body: JSON.stringify(input),
        });

        // Refresh the list to get all newly generated report cards
        await fetchReportCards();

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to bulk generate report cards"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchReportCards]
  );

  /**
   * Calculate class positions for report cards
   */
  const calculatePositions = useCallback(
    async (input: CalculatePositionsInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ classId: string; termId: string; totalStudents: number; updated: number }>(
          `/report-cards/positions`,
          {
            method: "POST",
            body: JSON.stringify(input),
          }
        );

        // Refresh the list to get updated positions
        await fetchReportCards();

        return response;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to calculate positions"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchReportCards]
  );

  /**
   * Update a report card (remarks, promotion status) (Optimistic update)
   */
  const updateReportCard = useCallback(
    async (id: string, input: UpdateReportCardInput) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: ReportCard }>(
          `/report-cards/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(input),
          }
        );

        // ✅ Optimistic update - replace in local state
        setReportCards(prev =>
          prev.map(rc => rc.id === id ? response.data : rc)
        );

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update report card"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Delete a report card (hard delete - ADMIN only) (Optimistic update)
   */
  const deleteReportCard = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiRequest<{ data: ReportCard }>(
          `/report-cards/${id}`,
          {
            method: "DELETE",
          }
        );

        // ✅ Optimistic update - remove from local state
        setReportCards(prev => prev.filter(rc => rc.id !== id));
        setMeta(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          totalPages: Math.ceil(Math.max(0, prev.total - 1) / prev.pageSize)
        }));

        return response.data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete report card"
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Fetch report cards on mount and when filters/pagination change
  // Only fetch if authenticated to prevent infinite loops on 401 errors
  useEffect(() => {
    const token = getAuthToken();

    if (token) {
      fetchReportCards();
    } else {
      setError("Please login to view report cards");
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters?.studentId,
    filters?.classId,
    filters?.termId,
    filters?.academicYearId,
    filters?.promotionStatus,
    pagination?.page,
    pagination?.pageSize
  ]);

  return {
    // State
    reportCards,
    meta,
    isLoading,
    error,

    // Methods
    refetch: fetchReportCards,
    getReportCard,
    generateReportCard,
    bulkGenerateReportCards,
    calculatePositions,
    updateReportCard,
    deleteReportCard,
  };
}
