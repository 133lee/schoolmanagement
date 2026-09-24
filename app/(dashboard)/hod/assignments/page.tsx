"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCompactClassLabel } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssignmentsDashboard } from "@/components/assignments";
import { useToast } from "@/hooks/use-toast";
import type {
  AssignmentTeacher,
  AssignmentSubject,
  AssignmentClass,
  Assignment,
  ActivityLogItem,
  Term,
  CurriculumItem,
  AssignableTeacher,
} from "@/components/assignments/types";

interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
}

export interface SchoolTerm {
  id: string;
  name: string;
  termType: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
}

export default function HodAssignmentsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [teachers, setTeachers] = useState<AssignmentTeacher[]>([]);
  const [subjects, setSubjects] = useState<AssignmentSubject[]>([]);
  const [classes, setClasses] = useState<AssignmentClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [academicYears, setAcademicYears] = useState<Term[]>([]);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState<string>("");
  const [departmentName, setDepartmentName] = useState<string>("Department");
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  // Curriculum-based data
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);
  const [assignableTeachers, setAssignableTeachers] = useState<AssignableTeacher[]>([]);
  const [schoolTerms, setSchoolTerms] = useState<SchoolTerm[]>([]);

  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("Authentication token not found. Please log in again.");
    }
    return token;
  }, []);

  // Sync teacher workload with real periods from curriculum API
  useEffect(() => {
    if (!assignableTeachers.length) return;
    setTeachers((prev) =>
      prev.map((t) => {
        const at = assignableTeachers.find((a) => a.id === t.id);
        if (!at) return t;
        return {
          ...t,
          periodsPerWeek: at.currentPeriodsPerWeek,
          maxPeriods: at.maxPeriodsPerWeek,
        };
      })
    );
  }, [assignableTeachers]);

  // Compute totalClasses per teacher from current-year assignments
  useEffect(() => {
    if (!assignments.length) return;
    const classesByTeacher = new Map<string, Set<string>>();
    assignments.forEach((a) => {
      if (!a.teacherId) return;
      if (!classesByTeacher.has(a.teacherId))
        classesByTeacher.set(a.teacherId, new Set());
      classesByTeacher.get(a.teacherId)!.add(a.classId);
    });
    setTeachers((prev) =>
      prev.map((t) => ({
        ...t,
        totalClasses: classesByTeacher.get(t.id)?.size ?? t.totalClasses,
      }))
    );
  }, [assignments]);

  // Derive activity log from loaded assignment data
  useEffect(() => {
    if (!assignments.length || !teachers.length || !subjects.length || !classes.length) return;
    const derived: ActivityLogItem[] = [...assignments]
      .filter((a) => a.teacherId && a.assignedDate)
      .sort(
        (a, b) =>
          new Date(b.assignedDate!).getTime() - new Date(a.assignedDate!).getTime()
      )
      .slice(0, 30)
      .flatMap((a) => {
        const teacher = teachers.find((t) => t.id === a.teacherId);
        const subject = subjects.find((s) => s.id === a.subjectId);
        const cls = classes.find((c) => c.id === a.classId);
        if (!teacher || !subject || !cls) return [];
        return [
          {
            id: a.id,
            action: "assigned" as const,
            teacherName: teacher.name,
            subjectName: subject.name,
            className: formatCompactClassLabel(cls.grade, cls.name),
            timestamp: a.assignedDate!,
          },
        ];
      });
    setActivities(derived);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, teachers, subjects, classes]);

  const fetchAssignments = useCallback(
    async (academicYearId: string) => {
      try {
        const token = getAuthToken();

        const response = await fetch(
          `/api/hod/assignments?academicYearId=${academicYearId}&pageSize=500`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch assignments");
        }

        const result = await response.json();
        if (result.success) {
          const data = result.data?.data || result.data || [];
          const mappedAssignments: Assignment[] = data.map((a: any) => ({
            id: a.id,
            teacherId: a.teacherId,
            subjectId: a.subjectId,
            classId: a.classId,
            termId: a.academicYearId || academicYearId,
            assignedDate: a.createdAt
              ? new Date(a.createdAt).toISOString()
              : null,
          }));
          setAssignments(mappedAssignments);
        }
      } catch (err) {
        console.error("Error fetching assignments:", err);
      }
    },
    [getAuthToken]
  );

  // Fetch curriculum (ClassSubjects) for HOD's department
  const fetchCurriculum = useCallback(
    async (academicYearId: string) => {
      try {
        const token = getAuthToken();

        const response = await fetch(
          `/api/hod/curriculum?academicYearId=${academicYearId}&includeAssignments=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch curriculum:", errorData.error);
          return;
        }

        const result = await response.json();
        if (result.success) {
          setCurriculum(result.data.curriculum || []);
          // Map teachers to AssignableTeacher format
          const mappedTeachers: AssignableTeacher[] = (result.data.teachers || []).map(
            (t: any) => ({
              id: t.id,
              name: `${t.firstName} ${t.lastName}`,
              staffNumber: t.staffNumber || "",
              email: t.user?.email || "",
              phone: t.phone || "",
              departmentId: t.departmentId,
              currentPeriodsPerWeek: t.periodsPerWeek || 0,
              maxPeriodsPerWeek: t.maxPeriodsPerWeek || 30,
              isOverloaded: (t.periodsPerWeek || 0) >= (t.maxPeriodsPerWeek || 30),
              availableCapacity: Math.max(0, (t.maxPeriodsPerWeek || 30) - (t.periodsPerWeek || 0)),
              qualifiedSubjectIds: t.qualifiedSubjectIds || [],
            })
          );
          setAssignableTeachers(mappedTeachers);
        }
      } catch (err) {
        console.error("Error fetching curriculum:", err);
      }
    },
    [getAuthToken]
  );

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentAcademicYearId) {
      fetchAssignments(currentAcademicYearId);
      fetchCurriculum(currentAcademicYearId);
    }
  }, [currentAcademicYearId, fetchAssignments, fetchCurriculum]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();

      // Fetch HOD profile, teachers, subjects, classes, academic years, and terms in parallel
      const [profileRes, teachersRes, subjectsRes, classesRes, yearsRes, termsRes] =
        await Promise.all([
          fetch("/api/hod/profile", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/hod/teachers?mode=all", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/hod/subjects?mode=all", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/classes?mode=all", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/academic-years", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/hod/reports/terms", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      // Parse profile
      if (profileRes.ok) {
        const profileResult = await profileRes.json();
        if (profileResult.success && profileResult.data?.department) {
          setDepartmentName(profileResult.data.department.name + " Department");
        }
      }

      // Parse teachers
      if (teachersRes.ok) {
        const teachersResult = await teachersRes.json();
        if (teachersResult.success) {
          const teachersData =
            teachersResult.data?.data || teachersResult.data || [];
          const mappedTeachers: AssignmentTeacher[] = teachersData.map(
            (t: any) => ({
              id: t.id,
              name: `${t.firstName} ${t.lastName}`,
              email: t.user?.email || t.email || "",
              phone: t.phone || "",
              departmentId: t.departmentId,
              totalClasses: t._count?.subjectTeacherAssignments || 0,
              periodsPerWeek: (t._count?.subjectTeacherAssignments || 0) * 5, // Estimate: 5 periods per assignment
              maxPeriods: 30, // Default max periods per week
            })
          );
          setTeachers(mappedTeachers);
        }
      } else {
        console.error("Failed to fetch teachers:", teachersRes.status);
      }

      // Parse subjects
      if (subjectsRes.ok) {
        const subjectsResult = await subjectsRes.json();
        if (subjectsResult.success) {
          const subjectsData =
            subjectsResult.data?.data || subjectsResult.data || [];
          const mappedSubjects: AssignmentSubject[] = subjectsData.map(
            (s: any) => ({
              id: s.id,
              name: s.name,
              code: s.code,
              departmentId: s.departmentId,
              color: "", // Will use default colors
            })
          );
          setSubjects(mappedSubjects);
        }
      } else {
        console.error("Failed to fetch subjects:", subjectsRes.status);
      }

      // Parse classes - filter to secondary grades only (8-12)
      if (classesRes.ok) {
        const classesResult = await classesRes.json();
        if (classesResult.success) {
          const classesData =
            classesResult.data?.data || classesResult.data || [];
          const secondaryGrades = [
            "GRADE_8",
            "GRADE_9",
            "GRADE_10",
            "GRADE_11",
            "GRADE_12",
            "8",
            "9",
            "10",
            "11",
            "12",
          ];
          const mappedClasses: AssignmentClass[] = classesData
            .filter((c: any) => {
              const gradeLevel = c.grade?.level || c.gradeLevel?.level || "";
              const gradeName = c.grade?.name || c.gradeLevel?.name || "";
              return secondaryGrades.some(
                (g) => gradeLevel.includes(g) || gradeName.includes(g)
              );
            })
            .map((c: any) => ({
              id: c.id,
              name: c.name,
              grade: c.grade?.name || c.gradeLevel?.name || "",
            }));
          setClasses(mappedClasses);
        }
      } else {
        console.error("Failed to fetch classes:", classesRes.status);
      }

      // Parse academic years
      if (yearsRes.ok) {
        const yearsResult = await yearsRes.json();
        if (yearsResult.success) {
          const yearsData = yearsResult.data || [];
          const mappedYears: Term[] = yearsData.map((y: AcademicYear) => ({
            id: y.id,
            name: y.year,
            academicYearId: y.id,
            startDate: "",
            endDate: "",
          }));
          setAcademicYears(mappedYears);

          // Set active academic year as default
          const activeYear = yearsData.find((y: AcademicYear) => y.isActive);
          if (activeYear) {
            setCurrentAcademicYearId(activeYear.id);
          } else if (mappedYears.length > 0) {
            setCurrentAcademicYearId(mappedYears[0].id);
          }
        }
      } else {
        console.error("Failed to fetch academic years:", yearsRes.status);
      }

      // Parse terms
      if (termsRes.ok) {
        const termsResult = await termsRes.json();
        const termsData = termsResult.data?.terms || termsResult.data || [];
        setSchoolTerms(termsData);
      }
    } catch (err) {
      console.error("Error fetching initial data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (
    subjectId: string,
    classId: string,
    teacherId: string
  ) => {
    try {
      const token = getAuthToken();

      // Check if assignment already exists
      const existingAssignment = assignments.find(
        (a) => a.subjectId === subjectId && a.classId === classId
      );

      if (existingAssignment) {
        // Update existing assignment
        const response = await fetch(
          `/api/hod/assignments/${existingAssignment.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ teacherId }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update assignment");
        }
      } else {
        // Create new assignment
        const response = await fetch("/api/hod/assignments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            teacherId,
            subjectId,
            classId,
            academicYearId: currentAcademicYearId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create assignment");
        }
      }

      // Refresh assignments
      await fetchAssignments(currentAcademicYearId);

      // Add to activity log
      const teacher = teachers.find((t) => t.id === teacherId);
      const subject = subjects.find((s) => s.id === subjectId);
      const cls = classes.find((c) => c.id === classId);

      if (teacher && subject && cls) {
        setActivities((prev) => [
          {
            id: Date.now().toString(),
            action: existingAssignment ? "reassigned" : "assigned",
            teacherName: teacher.name,
            className: formatCompactClassLabel(cls.grade, cls.name),
            subjectName: subject.name,
            timestamp: new Date().toISOString(),
          },
          ...prev.slice(0, 19), // Keep last 20 activities
        ]);
      }
    } catch (err) {
      console.error("Error assigning teacher:", err);
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to assign teacher",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleAcademicYearChange = (yearId: string) => {
    setCurrentAcademicYearId(yearId);
  };

  // Unassign a teacher from a class-subject assignment
  const handleUnassign = async (assignmentId: string) => {
    const token = getAuthToken();

    // Look up details before deleting so we can log a meaningful activity entry
    const curriculumItem = curriculum.find(
      (c) => c.currentAssignment?.id === assignmentId
    );
    const assignment = assignments.find((a) => a.id === assignmentId);
    const teacher =
      teachers.find((t) => t.id === (curriculumItem?.currentAssignment?.teacher.id ?? assignment?.teacherId)) ??
      undefined;
    const subject = subjects.find(
      (s) => s.id === (curriculumItem?.subject.id ?? assignment?.subjectId)
    );
    const cls = classes.find(
      (c) => c.id === (curriculumItem?.class.id ?? assignment?.classId)
    );

    const response = await fetch(`/api/hod/assignments/${assignmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to unassign teacher");
    }

    // Refresh both assignments and curriculum
    await Promise.all([
      fetchAssignments(currentAcademicYearId),
      fetchCurriculum(currentAcademicYearId),
    ]);

    if (teacher && subject && cls) {
      setActivities((prev) => [
        {
          id: Date.now().toString(),
          action: "unassigned",
          teacherName: teacher.name,
          className: formatCompactClassLabel(cls.grade, cls.name),
          subjectName: subject.name,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 19),
      ]);
    }
  };

  // Curriculum-based assignment handler
  const handleCurriculumAssign = async (classSubjectId: string, teacherId: string) => {
    const token = getAuthToken();

    // Find the curriculum item to get subject/class info
    const curriculumItem = curriculum.find((c) => c.classSubjectId === classSubjectId);
    if (!curriculumItem) {
      throw new Error("Curriculum item not found");
    }

    // Check if assignment already exists for this classSubject
    const existingAssignment = curriculumItem.currentAssignment;

    try {
      if (existingAssignment) {
        // Update existing assignment
        const response = await fetch(
          `/api/hod/assignments/${existingAssignment.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ teacherId }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update assignment");
        }
      } else {
        // Create new assignment using classSubjectId
        const response = await fetch("/api/hod/assignments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            teacherId,
            subjectId: curriculumItem.subject.id,
            classId: curriculumItem.class.id,
            academicYearId: currentAcademicYearId,
            classSubjectId, // Pass the classSubjectId for direct linking
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create assignment");
        }
      }

      // Refresh both assignments and curriculum
      await Promise.all([
        fetchAssignments(currentAcademicYearId),
        fetchCurriculum(currentAcademicYearId),
      ]);

      // Add to activity log
      const teacher = assignableTeachers.find((t) => t.id === teacherId);
      if (teacher && curriculumItem) {
        setActivities((prev) => [
          {
            id: Date.now().toString(),
            action: existingAssignment ? "reassigned" : "assigned",
            teacherName: teacher.name,
            className: formatCompactClassLabel(curriculumItem.class.grade.name, curriculumItem.class.name),
            subjectName: curriculumItem.subject.name,
            timestamp: new Date().toISOString(),
          },
          ...prev.slice(0, 19),
        ]);
      }
    } catch (err) {
      console.error("Error in curriculum assignment:", err);
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to assign teacher",
        variant: "destructive",
      });
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="bg-background">
        {/* Header skeleton — mirrors AssignmentsDashboard's own header
            (title hidden on mobile, search + term share one row) */}
        <div className="px-4 py-4 lg:px-6">
          <div className="hidden lg:flex items-center justify-between mb-4">
            <div className="space-y-1">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex gap-2 lg:gap-3">
            <Skeleton className="h-9 flex-1 lg:min-w-[280px] lg:max-w-md lg:flex-none" />
            <Skeleton className="h-9 w-24 lg:w-[180px]" />
          </div>
        </div>

        {/* Stats skeleton — mirrors the 2x2/1x4 StatCard grid */}
        <div className="px-4 py-4 lg:px-6 border-b border-border bg-secondary/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-3 lg:p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-7 lg:h-10 lg:w-10 rounded-md lg:rounded-lg" />
                </div>
                <Skeleton className="h-5 lg:h-7 w-10" />
              </div>
            ))}
          </div>
        </div>

        {/* Main card skeleton — mirrors the tabs bar + matrix */}
        <div className="p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-40 lg:w-96 rounded-md" />
            <Skeleton className="h-8 w-8 lg:w-36 rounded-md" />
          </div>
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32 lg:w-40" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-20 lg:w-28" />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-14 w-32 lg:w-40" />
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-14 w-20 lg:w-28" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AssignmentsDashboard
      teachers={teachers}
      subjects={subjects}
      classes={classes}
      assignments={assignments}
      activities={activities}
      terms={academicYears}
      currentTermId={currentAcademicYearId}
      departmentName={departmentName}
      onAssign={handleAssign}
      onTermChange={handleAcademicYearChange}
      isLoading={loading}
      curriculum={curriculum}
      assignableTeachers={assignableTeachers}
      onCurriculumAssign={handleCurriculumAssign}
      onCurriculumUnassign={handleUnassign}
      schoolTerms={schoolTerms}
    />
  );
}
