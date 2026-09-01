/**
 * Re-export Prisma enums and types for use throughout the application
 *
 * This file re-exports from the generated Prisma client to provide:
 * 1. Consistent imports across the codebase
 * 2. Type safety for enums
 * 3. Single source of truth
 * 4. Client-safe imports (from enums.ts, not the full Prisma client)
 *
 * Note: This file should be kept in sync with prisma/schema.prisma
 * To regenerate types: npx prisma generate
 */

// ==================== ENUMS ====================
// Re-export all enums from generated Prisma enums (client-safe)

export {
  // Academic Structure
  TermType,
  GradeLevel,
  SchoolLevel,

  // Status Enums
  ClassStatus,
  DepartmentStatus,
  StudentStatus,
  ParentStatus,
  StaffStatus,
  EnrollmentStatus,
  PromotionStatus,
  AssessmentStatus,
  AttendanceStatus,

  // Personal Information
  Gender,
  ParentRelationship,
  VulnerabilityStatus,
  OrphanType,
  DeceasedParent,
  QualificationLevel,

  // System & Security
  Role,
  Permission,

  // Academic Operations
  DayOfWeek,
  ExamType,
  ECZGrade,
  RoomType,
  TeacherSubjectRole,

  // SMS
  SMSProvider,
  SMSStatus,

  // Notifications
  NotificationType,
  NotificationStatus,
  NotificationPriority,
} from '@prisma/client';

// ==================== TYPE EXPORTS ====================
// Type exports are automatically available from the value exports above
// TypeScript can infer types from the enum values, so we don't need duplicate type exports

// ==================== MODEL TYPES ====================
// Re-export commonly used Prisma model types (client-safe, type-only imports)

export type {
  // User & Authentication
  User,
  TeacherProfile,
  // UserRole,  // Not in current schema - removed
  UserPermission,
  RolePermission,

  // Students & Parents
  Student,
  Guardian,
  StudentGuardian,
  StudentClassEnrollment,
  StudentPromotion,

  // Academic Structure
  AcademicYear,
  Term,
  Grade,
  Class,
  GradeSubject,

  // Staff & Departments
  Department,
  Subject,
  TeacherSubject,
  SubjectTeacherAssignment,
  ClassTeacherAssignment,

  // Assessments & Grading
  Assessment,
  StudentAssessmentResult,
  ReportCard,
  ReportCardSubject,
  EczGradingScheme,

  // Attendance
  AttendanceRecord,
  LessonLog,

  // Timetable
  TimeSlot,
  ClassTimetable,
  SecondaryTimetable,
  SubjectPeriodRequirement,
  TimetableConfiguration,
  TimetableSlot,
  ClassSubject,
  Room,

  // Department Relations
  TeacherDepartment,

  // System Settings
  SystemSettings,

  // Notifications
  Notification,
} from '@prisma/client';
