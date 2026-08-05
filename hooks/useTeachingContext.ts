import { useState, useEffect } from "react";
import { apiRequest, getAuthToken } from "@/lib/api-client";

interface ClassAssignment {
  id: string;
  classId: string;
  className: string;
  gradeName: string;
}

interface SubjectAssignment {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  classId: string;
  className: string;
  gradeName: string;
}

interface TeachingContextData {
  isClassTeacher: boolean;
  isSubjectTeacher: boolean;
  classAssignments: ClassAssignment[];
  subjectAssignments: SubjectAssignment[];
}

interface UseTeachingContextReturn {
  hasTeachingContext: boolean;
  contexts: TeachingContextData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTeachingContext(): UseTeachingContextReturn {
  const [hasTeachingContext, setHasTeachingContext] = useState(false);
  const [contexts, setContexts] = useState<TeachingContextData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeachingContext = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!getAuthToken()) {
        setHasTeachingContext(false);
        setContexts(null);
        return;
      }

      const { data } = await apiRequest<{
        data: { hasTeachingContext: boolean; contexts: TeachingContextData | null };
      }>("/user/teaching-context");
      setHasTeachingContext(data.hasTeachingContext);
      setContexts(data.contexts);
    } catch (err) {
      console.error("Error fetching teaching context:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setHasTeachingContext(false);
      setContexts(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachingContext();
  }, []);

  return {
    hasTeachingContext,
    contexts,
    isLoading,
    error,
    refetch: fetchTeachingContext,
  };
}
