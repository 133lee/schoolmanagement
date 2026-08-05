// Types for the assignment management UI

export interface AssignmentTeacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string | null;
  totalClasses: number;
  periodsPerWeek: number;
  maxPeriods: number;
}

export interface AssignmentSubject {
  id: string;
  name: string;
  code: string;
  departmentId: string | null;
  color: string;
}

export interface AssignmentClass {
  id: string;
  name: string;
  grade: string;
  section: string;
}

export interface Assignment {
  id: string;
  teacherId: string | null;
  subjectId: string;
  classId: string;
  termId: string;
  assignedDate: string | null;
}

// ============================================
// ClassSubject-based Curriculum Types
// These represent the authoritative curriculum
// ============================================

/**
 * CurriculumItem represents a ClassSubject - the source of truth for
 * what subjects a class offers. This is what HODs should select from
 * when assigning teachers.
 */
export interface CurriculumItem {
  classSubjectId: string;
  isCore: boolean;
  periodsPerWeek: number;
  subject: {
    id: string;
    code: string;
    name: string;
  };
  class: {
    id: string;
    name: string;
    grade: {
      id: string;
      name: string;
      level: string;
    };
  };
  currentAssignment?: {
    id: string;
    teacher: {
      id: string;
      name: string;
      staffNumber: string;
    };
  } | null;
}

/**
 * Teacher available for assignment with workload information
 */
export interface AssignableTeacher {
  id: string;
  name: string;
  staffNumber: string;
  email?: string;
  phone?: string;
  departmentId: string | null;
  // Workload calculated from actual assignments
  currentPeriodsPerWeek: number;
  maxPeriodsPerWeek: number;
  // Computed
  isOverloaded: boolean;
  availableCapacity: number;
  // Subjects this teacher is qualified for
  qualifiedSubjectIds?: string[];
}

/**
 * Transform API teacher response to AssignableTeacher
 */
export function transformToAssignableTeacher(
  teacher: AssignmentTeacher
): AssignableTeacher {
  const isOverloaded = teacher.periodsPerWeek >= teacher.maxPeriods;
  return {
    id: teacher.id,
    name: teacher.name,
    staffNumber: "", // Will be populated from API
    email: teacher.email,
    phone: teacher.phone,
    departmentId: teacher.departmentId,
    currentPeriodsPerWeek: teacher.periodsPerWeek,
    maxPeriodsPerWeek: teacher.maxPeriods,
    isOverloaded,
    availableCapacity: Math.max(0, teacher.maxPeriods - teacher.periodsPerWeek),
  };
}

/**
 * Curriculum stats summary
 */
export interface CurriculumStats {
  total: number;
  assigned: number;
  unassigned: number;
  totalPeriodsPerWeek: number;
}

export interface Term {
  id: string;
  name: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
}

export type LoadStatus = "normal" | "overloaded" | "underutilized";

export interface TeacherWorkload {
  teacher: AssignmentTeacher;
  assignments: Assignment[];
  loadStatus: LoadStatus;
}

export interface ActivityLogItem {
  id: string;
  action: "assigned" | "reassigned" | "unassigned";
  teacherName: string;
  className: string;
  subjectName: string;
  timestamp: string;
}

// Helper function to determine load status
export function getLoadStatus(teacher: AssignmentTeacher): LoadStatus {
  const ratio = teacher.periodsPerWeek / teacher.maxPeriods;
  if (ratio > 1) return "overloaded";
  if (ratio < 0.5) return "underutilized";
  return "normal";
}

// Helper function to get load label
export function getLoadLabel(status: LoadStatus): string {
  switch (status) {
    case "overloaded":
      return "Overloaded";
    case "underutilized":
      return "Underutilized";
    default:
      return "Normal";
  }
}

// Default subject colors for visual distinction
export const DEFAULT_SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3B82F6",
  English: "#10B981",
  Science: "#8B5CF6",
  Physics: "#F59E0B",
  Chemistry: "#EF4444",
  Biology: "#22C55E",
  History: "#6366F1",
  Geography: "#14B8A6",
  "Computer Studies": "#EC4899",
  "Physical Education": "#F97316",
  Art: "#A855F7",
  Music: "#06B6D4",
};

export function getSubjectColor(subjectName: string): string {
  return DEFAULT_SUBJECT_COLORS[subjectName] || "#6B7280";
}
