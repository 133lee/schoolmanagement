/**
 * Types for HOD Assessment Entry Monitoring Dashboard
 */

export type AssessmentEntryStatus = 'completed' | 'in-progress' | 'not-started' | 'overdue';

export interface TeacherAssessmentEntry {
  id: string;
  teacherId: string;
  teacherUserId: string;
  teacherName: string;
  teacherEmail: string;
  subject: string;
  subjectCode: string;
  subjectId: string;
  className: string;
  classId: string;
  totalStudents: number;
  scoresEntered: number;
  deadline: Date;
  lastUpdated: Date;
  status: AssessmentEntryStatus;
  assessmentId: string;
  assessmentType: string;
  termId: string;
}

export interface StudentEntryDetail {
  id: string;
  studentName: string;
  studentId: string;
  admissionNumber: string;
  scoreEntered: boolean;
  score?: number;
  maxScore: number;
  enteredAt?: Date;
}

export interface AssessmentActivityLog {
  id: string;
  action: string;
  description: string;
  timestamp: Date;
  user: string;
}

export interface AssessmentDashboardStats {
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  totalAssessments: number;
}

export interface AssessmentFilterOptions {
  term: string;
  assessmentType: string;
  class: string;
  teacher: string;
  status: string;
}

export interface AssessmentEntryResponse {
  assessments: TeacherAssessmentEntry[];
  stats: AssessmentDashboardStats;
  filters: {
    terms: { id: string; name: string }[];
    assessmentTypes: string[];
    classes: { id: string; name: string }[];
    teachers: { id: string; name: string }[];
  };
}
