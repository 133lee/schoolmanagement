import { useState, useEffect } from "react";
import { apiRequest, getAuthToken } from "@/lib/api-client";

interface SubjectInfo {
  id: string;
  name: string;
  code: string;
}

interface TeacherInfo {
  id: string;
  firstName: string;
  lastName: string;
  staffNumber: string;
  email: string;
  isActive: boolean;
}

interface DepartmentInfo {
  id: string;
  name: string;
  code: string;
  description: string | null;
  totalSubjects: number;
  totalTeachers: number;
  totalStudents: number;
  activeClasses: number;
}

interface PerformanceMetrics {
  averagePerformance: number;
  passRate: number;
  bestPerformingSubject: { name: string; average: number } | null;
  subjectNeedingAttention: { name: string; average: number } | null;
}

interface StatsInfo {
  totalAssessments: number;
  pendingAssessments: number;
  activeClasses: number;
  totalStudents: number;
}

interface HodDashboardData {
  department: DepartmentInfo;
  performance: PerformanceMetrics;
  stats: StatsInfo;
  subjects: SubjectInfo[];
  teachers: TeacherInfo[];
  academicYear: {
    id: string;
    name: string;
  };
  term: {
    id: string;
    name: string;
  } | null;
}

interface UseHodDashboardReturn {
  data: HodDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useHodDashboard(): UseHodDashboardReturn {
  const [data, setData] = useState<HodDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!getAuthToken()) {
        throw new Error("No authentication token found");
      }

      const { data: dashboardData } = await apiRequest<{ data: HodDashboardData }>(
        "/hod/dashboard"
      );
      setData(dashboardData);
    } catch (err) {
      console.error("Error fetching HOD dashboard:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboard,
  };
}
