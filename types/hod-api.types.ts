/**
 * HOD API Response Types
 *
 * TypeScript interfaces for HOD module API responses.
 * Provides type safety and autocomplete for API contracts.
 */

// ============================================================================
// Common Types
// ============================================================================

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Grade Types
// ============================================================================

export interface GradeLevel {
  id: string;
  name: string;
  level: string;
  sequence: number;
}

export interface GradesResponse {
  success: true;
  grades: GradeLevel[];
}

// ============================================================================
// Class Types
// ============================================================================

export interface ClassOption {
  id: string;
  name: string;
  gradeId: string;
  gradeName: string;
  capacity: number;
  currentEnrolled?: number;
  status?: string;
}

export interface ClassesResponse {
  success: true;
  classes: ClassOption[];
}

// ============================================================================
// Subject Types
// ============================================================================

export interface SubjectOption {
  id: string;
  name: string;
  code: string;
  departmentId?: string;
}

export interface SubjectsResponse {
  success: true;
  subjects: SubjectOption[];
}

export interface SubjectsPaginatedResponse extends ApiSuccessResponse<SubjectOption[]> {
  meta: PaginationMeta;
}

// ============================================================================
// Teacher Types
// ============================================================================

export interface TeacherUser {
  email: string;
  isActive: boolean;
}

export interface TeacherDepartment {
  department: {
    name: string;
    code: string;
  };
}

export interface Teacher {
  id: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  gender?: string;
  qualification?: string;
  status?: string;
  user?: TeacherUser;
  departments?: TeacherDepartment[];
}

export interface TeachersPaginatedResponse extends ApiSuccessResponse<Teacher[]> {
  meta: PaginationMeta;
}

// ============================================================================
// Term Types
// ============================================================================

export interface TermOption {
  id: string;
  name: string;
  termType: string;
  academicYearId: string;
  academicYear: string;
  isActive: boolean;
}

export interface TermsResponse {
  success: true;
  terms: TermOption[];
}

// ============================================================================
// Academic Year Types
// ============================================================================

export interface AcademicYear {
  id: string;
  year: string;
  isActive: boolean;
  isClosed?: boolean;
}

export interface AcademicYearsResponse {
  success: true;
  data: AcademicYear[];
}

// ============================================================================
// Assignment Types
// ============================================================================

export interface Assignment {
  id: string;
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    staffNumber: string;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  class?: {
    id: string;
    name: string;
  };
  academicYear?: {
    id: string;
    year: string;
  };
}

export interface AssignmentsResponse {
  success: true;
  data: Assignment[];
}

export interface AssignmentResponse {
  success: true;
  data: Assignment;
}

// ============================================================================
// Profile Types
// ============================================================================

export interface DepartmentInfo {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  createdAt: string;
  totalSubjects: number;
  totalTeachers: number;
  subjects: SubjectOption[];
  teachers: Array<{
    id: string;
    staffNumber: string;
    firstName: string;
    lastName: string;
    qualification: string;
  }>;
}

export interface HODProfile {
  id: string;
  email: string;
  role: string;
  hasDefaultPassword: boolean;
  lastLogin: string | null;
  createdAt: string;
  department: DepartmentInfo;
}

export interface ProfileResponse {
  success: true;
  data: HODProfile;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface PerformanceMetrics {
  averagePerformance: number;
  passRate: number;
  bestPerformingSubject: {
    name: string;
    average: number;
  } | null;
  subjectNeedingAttention: {
    name: string;
    average: number;
  } | null;
}

export interface DashboardStats {
  totalAssessments: number;
  pendingAssessments: number;
  activeClasses: number;
  totalStudents: number;
}

export interface DashboardData {
  department: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    totalSubjects: number;
    totalTeachers: number;
    totalStudents: number;
    activeClasses: number;
  };
  performance: PerformanceMetrics;
  stats: DashboardStats;
  subjects: SubjectOption[];
  teachers: Teacher[];
  academicYear: AcademicYear;
  term: TermOption | null;
}

export interface DashboardResponse {
  success: true;
  data: DashboardData;
}

// ============================================================================
// Reports Types
// ============================================================================

export interface StudentPerformance {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  averageMark: number;
  grade: string;
  position: number;
  remarks?: string;
}

export interface PerformanceListsData {
  passed: StudentPerformance[];
  failed: StudentPerformance[];
  topImprovers: Array<{
    studentId: string;
    studentName: string;
    improvement: number;
    currentAverage: number;
    previousAverage: number;
  }>;
  stats: {
    totalStudents: number;
    passedCount: number;
    failedCount: number;
    passRate: number;
  };
}

export interface PerformanceResponse {
  success: true;
  data: PerformanceListsData;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

export function isApiError(response: ApiResponse<any>): response is ApiErrorResponse {
  return response.success === false;
}

// ============================================================================
// Helper Types
// ============================================================================

export type ExtractData<T> = T extends ApiSuccessResponse<infer D> ? D : never;
export type ExtractMeta<T> = T extends { meta: infer M } ? M : never;
