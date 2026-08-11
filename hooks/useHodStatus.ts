import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/api-client";

interface HODDepartment {
  id: string;
  name: string;
  code: string;
}

interface UseHodStatusReturn {
  isHOD: boolean;
  department?: HODDepartment;
  isLoading: boolean;
}

/**
 * HOD status is position-based (Department.hodTeacherId), NOT role-based —
 * see lib/auth/position-helpers.ts. This is the single fetch of that status
 * for UI purposes; shared by the desktop ContextSwitcher and the mobile
 * drawers' teacher/HOD switch buttons.
 */
export function useHodStatus(): UseHodStatusReturn {
  const [isHOD, setIsHOD] = useState(false);
  const [department, setDepartment] = useState<HODDepartment | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkHODStatus = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/auth/hod-status", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setIsHOD(data.data.isHOD);
          setDepartment(data.data.department);
        }
      } catch (error) {
        console.error("Error checking HOD status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkHODStatus();
  }, []);

  return { isHOD, department, isLoading };
}
