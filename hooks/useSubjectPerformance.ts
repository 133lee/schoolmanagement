import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";

interface AssessmentScore {
  type: "CAT" | "MID" | "EOT";
  score: number;
  rank: number;
  total: number;
  trend: "up" | "down" | "same";
}

interface StudentPerformance {
  studentId: string;
  studentName: string;
  assessments: AssessmentScore[];
}

interface SubjectPerformanceData {
  subjectId: string;
  termId: string;
  classId: string | null;
  students: StudentPerformance[];
}

interface UseSubjectPerformanceReturn {
  data: SubjectPerformanceData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch subject-specific performance data for all students
 */
export function useSubjectPerformance(
  subjectId: string | null,
  classId?: string | null,
  termId?: string
): UseSubjectPerformanceReturn {
  const [data, setData] = useState<SubjectPerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformance = async () => {
    if (!subjectId) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get active term if not provided
      let activeTermId = termId;
      if (!activeTermId) {
        const { data: termData } = await apiRequest<{ data: { id: string } }>("/terms/active");
        activeTermId = termData.id;
      }

      // Build query parameters
      const params = new URLSearchParams({
        subjectId,
        termId: activeTermId ?? "",
      });

      if (classId) {
        params.append("classId", classId);
      }

      // Fetch subject performance data
      const { data: performanceData } = await apiRequest<{ data: SubjectPerformanceData }>(
        `/teacher/subject-performance?${params.toString()}`
      );
      setData(performanceData);
    } catch (err) {
      console.error("Error fetching subject performance:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, classId, termId]);

  return {
    data,
    loading,
    error,
    refetch: fetchPerformance,
  };
}
