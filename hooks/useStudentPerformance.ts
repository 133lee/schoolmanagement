import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";

interface SubjectScore {
  subject: string;
  score: number;
}

interface ClassRanking {
  subject: string;
  subjectCode: string;
  score: number;
  rank: number;
  total: number;
  trend: "up" | "down" | "same";
  isTeacherSubject: boolean;
}

interface StudentPerformanceData {
  studentId: string;
  assessmentType: string;
  termId: string;
  radarChartData: SubjectScore[];
  classRankings: ClassRanking[];
  classPosition: number;
  classTotal: number;
  bestSix: number | null;
  bestSixCount?: number | null;
  bestSixType?: "points" | "standard_points" | "percentage";
  trend: "up" | "down" | "same";
  trendIsAbsolute?: boolean;
}

interface UseStudentPerformanceReturn {
  data: StudentPerformanceData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch and manage student performance data
 */
export function useStudentPerformance(
  studentId: string | null,
  assessmentType: "CAT1" | "MID" | "EOT",
  termId?: string
): UseStudentPerformanceReturn {
  const [data, setData] = useState<StudentPerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map CAT1 to CAT for backend
  const examType = assessmentType === "CAT1" ? "CAT" : assessmentType;

  const fetchPerformance = async () => {
    if (!studentId) {
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
        const { data: termData } = await apiRequest<{ data: { id: string } | null }>("/terms/active");

        // Valid empty state: no active term configured
        if (!termData) {
          setData(null);
          setLoading(false);
          setError(null); // Not an error - valid empty state
          return;
        }

        activeTermId = termData.id;
      }

      // Fetch performance data
      // Valid empty state: student has no assessment results yet. This is
      // normal when assessments haven't been created or student hasn't
      // taken them — empty radarChartData is handled by UI components.
      const { data: performanceData } = await apiRequest<{ data: StudentPerformanceData }>(
        `/teacher/students/${studentId}/performance?assessmentType=${examType}&termId=${activeTermId}`
      );
      setData(performanceData);
    } catch (err) {
      console.error("Error fetching student performance:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [studentId, assessmentType, termId]);

  return {
    data,
    loading,
    error,
    refetch: fetchPerformance,
  };
}
