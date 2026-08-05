/**
 * Timetable Solver Types
 * FET-style constraint-based timetable generation for Zambian schools
 * Adapted to work with the actual Prisma schema (timetable_slots table)
 */

// ============================================
// ENUMS (matching Prisma schema)
// ============================================

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
}

export enum SchoolLevel {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
}

// ============================================
// INPUT DATA TYPES (from database)
// ============================================

/**
 * Simplified period slot definition
 * Maps to the timetable_slots.periodNumber field
 */
export interface PeriodSlot {
  periodNumber: number;
  startTime: string; // "07:30"
  endTime: string;   // "08:10"
  isBreak: boolean;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface TeacherProfile {
  id: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
}

export interface Class {
  id: string;
  name: string;
  gradeId: string;
}

export interface Grade {
  id: string;
  name: string;
  level: number;
  schoolLevel: SchoolLevel;
}

/**
 * SubjectTeacherAssignment from Prisma
 */
export interface SubjectTeacherAssignment {
  id: string;
  subjectId: string;
  teacherId: string;
  classId: string;
  academicYearId: string;
  subject: Subject;
  teacher: TeacherProfile;
  class: Class;
}

/**
 * ClassSubject defines curriculum + periods per week
 * This is from the actual Prisma schema
 */
export interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  isCore: boolean;
  periodsPerWeek: number;
  subject: Subject;
  class: Class;
}

/**
 * Teacher availability constraints
 */
export interface TeacherAvailability {
  id: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number; // Changed from timeSlotId to periodNumber
  isAvailable: boolean;
}

// ============================================
// DOUBLE PERIOD CONFIGURATION
// ============================================

/**
 * Configuration for subjects requiring consecutive double periods
 * This is NOT stored in the schema but configured via admin UI
 */
export interface DoublePeriodConfig {
  subjectId: string;
  requiresDoublePeriod: boolean;
  // Which days can have double periods (empty = any day)
  allowedDays?: DayOfWeek[];
  // Whether to prefer morning or afternoon for doubles
  preferTimeOfDay?: 'MORNING' | 'AFTERNOON' | 'ANY';
}

// ============================================
// SOLVER INTERNAL TYPES
// ============================================

/**
 * An Activity represents a single lesson OR double period that needs to be placed
 * For double periods, isDoublePeriod=true and it occupies 2 consecutive slots
 */
export interface Activity {
  id: string;
  assignmentId: string; // SubjectTeacherAssignment ID
  subjectId: string;
  teacherId: string;
  classId: string;
  gradeId: string;
  academicYearId: string;
  instanceNumber: number; // 1, 2, 3... for multiple periods per week

  // Double period support
  isDoublePeriod: boolean; // True if this activity occupies 2 consecutive periods
  pairedActivityId?: string; // For doubles, links to the second half

  // Computed constraint score (higher = more constrained = place first)
  constraintScore: number;

  // Metadata for debugging
  label: string; // "10A-MATH-1" or "10A-SCIENCE-1-DOUBLE"
}

/**
 * A Slot represents an available position in the timetable
 * Uses periodNumber instead of timeSlotId to match schema
 */
export interface Slot {
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  startTime: string;
  endTime: string;
}

/**
 * A Placement is an Activity assigned to a Slot
 * For double periods, stores the first slot (second is periodNumber + 1)
 */
export interface Placement {
  activityId: string;
  activity: Activity;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  startTime: string;
  endTime: string;
}

/**
 * Tracks what's already placed (for constraint checking)
 */
export interface TimetableState {
  // teacher -> day -> periodNumber -> activityId
  teacherSchedule: Map<string, Map<DayOfWeek, Map<number, string>>>;

  // class -> day -> periodNumber -> activityId
  classSchedule: Map<string, Map<DayOfWeek, Map<number, string>>>;

  // class -> subjectId -> count of placed activities
  subjectCount: Map<string, Map<string, number>>;

  // class -> day -> count of lessons
  classLessonsPerDay: Map<string, Map<DayOfWeek, number>>;

  // teacher -> day -> count of lessons
  teacherLessonsPerDay: Map<string, Map<DayOfWeek, number>>;

  // All placements
  placements: Placement[];
}

// ============================================
// CONSTRAINT TYPES
// ============================================

export interface HardConstraintResult {
  satisfied: boolean;
  reason?: string;
}

export interface SoftConstraintResult {
  score: number; // 0-100, higher is better
  reason?: string;
}

// ============================================
// SOLVER CONFIGURATION
// ============================================

export interface SolverConfig {
  // Which days are school days
  schoolDays: DayOfWeek[];

  // Total periods per day (excluding breaks)
  totalPeriodsPerDay: number;

  // Maximum lessons per day per class
  maxLessonsPerDayPerClass: number;

  // Maximum lessons per day per teacher
  maxLessonsPerDayPerTeacher: number;

  // Double period configurations
  doublePeriodConfigs: DoublePeriodConfig[];

  // Prefer spreading subjects across the week
  spreadSubjectsAcrossWeek: boolean;

  // Avoid placing same subject on consecutive days
  avoidConsecutiveDays: boolean;

  // Prefer morning slots for core subjects
  preferMorningForCore: boolean;

  // Core subject IDs (for morning preference)
  coreSubjectIds: string[];

  // Maximum attempts before giving up
  maxAttempts: number;

  // Enable backtracking
  enableBacktracking: boolean;

  // Maximum backtrack depth
  maxBacktrackDepth: number;
}

export const DEFAULT_CONFIG: SolverConfig = {
  schoolDays: [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
  ],
  totalPeriodsPerDay: 8,
  maxLessonsPerDayPerClass: 8,
  maxLessonsPerDayPerTeacher: 6,
  doublePeriodConfigs: [],
  spreadSubjectsAcrossWeek: true,
  avoidConsecutiveDays: false,
  preferMorningForCore: true,
  coreSubjectIds: [],
  maxAttempts: 1000,
  enableBacktracking: true,
  maxBacktrackDepth: 50,
};

// ============================================
// SOLVER INPUT/OUTPUT
// ============================================

export interface SolverInput {
  academicYearId: string;
  assignments: SubjectTeacherAssignment[];
  classSubjects: ClassSubject[]; // Provides periodsPerWeek for each class-subject
  periodSlots: PeriodSlot[]; // Available periods (from configuration)
  teacherAvailabilities: TeacherAvailability[];
  config?: Partial<SolverConfig>;
}

export interface SolverOutput {
  success: boolean;
  placements: Placement[];
  unplacedActivities: Activity[];
  stats: {
    totalActivities: number;
    placedActivities: number;
    unplacedActivities: number;
    doublePeriodCount: number;
    attempts: number;
    backtrackCount: number;
    restartCount: number;
    duration: number; // ms
  };
  errors: string[];
  warnings: string[];
}

// ============================================
// DATABASE OUTPUT TYPES (for writing results)
// ============================================

/**
 * Maps to the timetable_slots table in Prisma schema
 */
export interface TimetableSlotEntry {
  id: string; // Generated CUID
  classId: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  startTime: string;
  endTime: string;
  room?: string | null;
}
