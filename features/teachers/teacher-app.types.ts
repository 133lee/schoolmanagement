/**
 * Teacher Application Types
 *
 * Types specific to teacher-facing features (viewing students, classes, profile, etc.)
 * Separate from admin teacher management types.
 */

export interface StudentView {
  id: string;
  studentNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  gender: string;
  dateOfBirth: Date;
  status: string;
  vulnerability: string | null;
  hasGuardian: boolean;
  guardianName: string | null;
}

export interface ClassView {
  id: string;
  name: string;
  grade: string;
  gradeLevel: string;
  capacity: number;
  enrolled: number;
}

export interface ClassWithStudents extends ClassView {
  subject: string;
  subjectCode: string;
  subjectId: string;
  students: StudentView[];
}

export interface ClassTeacherStudentsResponse {
  view: "class-teacher";
  class: ClassView | null;
  students: StudentView[];
}

export interface SubjectTeacherStudentsResponse {
  view: "subject-teacher";
  classes: ClassWithStudents[];
  selectedClassId?: string | null;
}

export type TeacherStudentsResponse =
  | ClassTeacherStudentsResponse
  | SubjectTeacherStudentsResponse;

export interface TeacherClassView {
  id: string;
  name: string;
  gradeLevel: string;
  totalStudents: number;
  capacity: number;
  isClassTeacher: boolean;
  teachingSubject: string;
  teachingSubjectId?: string; // First subject's id — only exists for subject teachers and secondary class teachers
  teachingSubjects?: Array<{ id: string; name: string }>; // All subjects (secondary class teachers may teach more than one in their own class)
  status: string;
}

export interface TeacherClassesResponse {
  classTeacherClasses: TeacherClassView[];
  subjectTeacherClasses: TeacherClassView[];
  allClasses: TeacherClassView[];
}

export interface TeacherProfileView {
  id: string;
  staffNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  gender: string;
  dateOfBirth: Date;
  phoneNumber: string;
  nrcNumber: string | null;
  email: string;
  dateOfHire: Date;
  status: string;
  qualification: string | null;
  specialization: string | null;
  department: {
    name: string;
    code: string;
  } | null;
  subjects: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  classTeacherAssignment: {
    className: string;
    gradeLevel: string;
  } | null;
}

export interface ReportCardStudentView {
  id: string;
  studentNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: string;
}

export interface ReportCardSubjectView {
  subjectName: string;
  subjectCode: string;
  catMark: number | null;
  midMark: number | null;
  eotMark: number | null;
  totalMark: number | null;
  grade: string | null;
  remarks: string | null;
}

export interface ReportCardView {
  id: string;
  student: ReportCardStudentView;
  totalMarks: number | null;
  averageMark: number | null;
  position: number | null;
  outOf: number | null;
  daysPresent: number;
  daysAbsent: number;
  attendance: number;
  classTeacherRemarks: string | null;
  headTeacherRemarks: string | null;
  promotionStatus: string | null;
  nextGrade: string | null;
  subjects: ReportCardSubjectView[];
}

export interface ReportStatistics {
  totalStudents: number;
  averageClassMark: number;
  passRate: number;
  distinctionRate: number;
  attendanceRate: number;
  isJuniorSecondary: boolean;
}

export interface ClassReportCardsResponse {
  reportCards: ReportCardView[];
  stats: ReportStatistics;
  classInfo: {
    id: string;
    name: string;
    grade: string;
  };
  termInfo: {
    id: string;
    termType: string;
  };
}

export interface AttendanceTrendData {
  date: string;
  boys: number;
  girls: number;
}

export interface AttendanceTrendsResponse {
  attendanceData: AttendanceTrendData[];
  timeRange: string;
  classId: string;
}
