"use client";

import { Building2, GraduationCap } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useTeachingContext } from "@/hooks/useTeachingContext";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import * as React from "react";

interface ContextSwitcherProps {
  userRole?: string;
}

interface HODStatus {
  isHOD: boolean;
  department?: {
    id: string;
    name: string;
    code: string;
  };
}

/**
 * Context Switcher Component
 *
 * Allows users who are both HOD (position) and have teaching assignments
 * to switch between HOD dashboard and Teacher dashboard.
 *
 * IMPORTANT: HOD status is position-based (Department.hodTeacherId), NOT role-based
 */
export function ContextSwitcher({ userRole }: ContextSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hasTeachingContext } = useTeachingContext();
  const [hodStatus, setHodStatus] = React.useState<HODStatus | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Check HOD position status (not role)
  React.useEffect(() => {
    const checkHODStatus = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/auth/hod-status", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setHodStatus({
            isHOD: data.data.isHOD,
            department: data.data.department,
          });
        }
      } catch (error) {
        console.error("Error checking HOD status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkHODStatus();
  }, []);

  const isInHODContext = pathname?.startsWith("/hod");
  const isInTeacherContext = pathname?.startsWith("/teacher");

  // Must be an HOD (position-based)
  if (isLoading || !hodStatus?.isHOD) {
    return null;
  }

  // "Switch to HOD" shows on teacher pages; "Switch to Teaching" only when there are assignments
  const switchToHODContext = isInTeacherContext;
  const switchToTeacherContext = isInHODContext && hasTeachingContext;

  // Don't show if neither direction applies
  if (!switchToHODContext && !switchToTeacherContext) {
    return null;
  }

  const handleSwitch = () => {
    if (switchToTeacherContext) {
      router.push("/teacher/students");
    } else if (switchToHODContext) {
      router.push("/hod");
    }
  };

  const departmentName = hodStatus.department?.name || "Department";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={handleSwitch}
          className="w-full"
          tooltip={
            switchToTeacherContext
              ? "Switch to Teaching Dashboard"
              : `Switch to HOD Dashboard (${departmentName})`
          }
        >
          {switchToTeacherContext ? (
            <>
              <GraduationCap className="size-4" />
              <span className="truncate">Teaching Mode</span>
            </>
          ) : (
            <>
              <Building2 className="size-4" />
              <span className="truncate">
                HOD - {hodStatus.department?.code || departmentName}
              </span>
            </>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
