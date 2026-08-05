import { useState, useEffect } from "react";
import { Grade, SchoolLevel } from "@/types/prisma-enums";
import { apiRequest } from "@/lib/api-client";

interface UseGradesOptions {
  schoolLevel?: SchoolLevel;
  /** Pass true to bypass the school-type auto-filter and return all 12 grades */
  all?: boolean;
}

interface UseGradesReturn {
  grades: Grade[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGrades(options?: UseGradesOptions): UseGradesReturn {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrades = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options?.all) {
        params.append("schoolLevel", "ALL");
      } else if (options?.schoolLevel) {
        params.append("schoolLevel", options.schoolLevel);
      }

      const url = `/grade-levels${params.toString() ? `?${params.toString()}` : ""}`;
      const { data } = await apiRequest<{ data: Grade[] }>(url);
      setGrades(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setGrades([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, [options?.schoolLevel, options?.all]);

  return {
    grades,
    isLoading,
    error,
    refetch: fetchGrades,
  };
}
