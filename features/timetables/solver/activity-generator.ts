/**
 * Activity Generator with Double Period Support
 * Converts SubjectTeacherAssignments + ClassSubjects into Activities
 */

import {
  Activity,
  SubjectTeacherAssignment,
  ClassSubject,
  TeacherAvailability,
  PeriodSlot,
  DayOfWeek,
  SolverConfig,
  DoublePeriodConfig,
} from './types';

/**
 * Generate activities from assignments and class curriculum
 * Supports both single periods and consecutive double periods
 *
 * For each assignment (Teacher X teaches Subject Y to Class Z):
 *   - Look up how many periods per week from ClassSubject
 *   - Check if subject requires double periods
 *   - Create appropriate Activity instances (single or paired doubles)
 *   - Calculate constraint score for ordering
 */
export function generateActivities(
  assignments: SubjectTeacherAssignment[],
  classSubjects: ClassSubject[],
  teacherAvailabilities: TeacherAvailability[],
  periodSlots: PeriodSlot[],
  config: SolverConfig
): Activity[] {
  const activities: Activity[] = [];

  // Build lookup: classId + subjectId -> periodsPerWeek
  const periodLookup = new Map<string, ClassSubject>();
  for (const cs of classSubjects) {
    const key = `${cs.classId}:${cs.subjectId}`;
    periodLookup.set(key, cs);
  }

  // Build lookup: teacherId -> available slot count
  const teacherAvailableSlots = calculateTeacherAvailableSlots(
    teacherAvailabilities,
    periodSlots,
    config
  );

  // Count how many classes each teacher has
  const teacherClassCount = new Map<string, number>();
  for (const assignment of assignments) {
    const count = teacherClassCount.get(assignment.teacherId) || 0;
    teacherClassCount.set(assignment.teacherId, count + 1);
  }

  // Build double period lookup for faster access
  const doublePeriodMap = new Map<string, DoublePeriodConfig>();
  for (const dp of config.doublePeriodConfigs) {
    doublePeriodMap.set(dp.subjectId, dp);
  }

  // Generate activities for each assignment
  for (const assignment of assignments) {
    const lookupKey = `${assignment.classId}:${assignment.subjectId}`;
    const classSubject = periodLookup.get(lookupKey);

    if (!classSubject) {
      console.warn(
        `No class subject found for ${assignment.subject.name} in class ${assignment.class.name}`
      );
      continue;
    }

    const periodsPerWeek = classSubject.periodsPerWeek;
    const gradeId = assignment.class.gradeId;

    // Check if this subject requires double periods
    const doublePeriodConfig = doublePeriodMap.get(assignment.subjectId);
    let requiresDouble = doublePeriodConfig?.requiresDoublePeriod || false;

    // SMART DEFAULT: Automatically use 2+2+1 pattern for 5-period subjects
    // This is optimal for subjects needing deep focus (sciences, languages, etc.)
    // Can be overridden via doublePeriodConfig
    if (periodsPerWeek === 5 && !doublePeriodConfig) {
      requiresDouble = true; // Auto-apply 2+2+1 pattern
    }

    // Also apply double periods for 4-period subjects (creates 2+2 pattern)
    if (periodsPerWeek === 4 && !doublePeriodConfig) {
      requiresDouble = true; // Auto-apply 2+2 pattern
    }

    // Allow explicit override to disable doubles even for 5-period subjects
    if (doublePeriodConfig?.requiresDoublePeriod === false) {
      requiresDouble = false; // Explicit override
    }

    // Calculate constraint score
    const constraintScore = calculateConstraintScore(
      assignment,
      periodsPerWeek,
      teacherAvailableSlots.get(assignment.teacherId) || 0,
      teacherClassCount.get(assignment.teacherId) || 0,
      requiresDouble
    );

    if (requiresDouble) {
      // Generate double period activities (each counts as 2 periods)
      // Pattern examples:
      //   5 periods → 2 doubles + 1 single = 2+2+1 (recommended for sciences, languages)
      //   4 periods → 2 doubles = 2+2 (good for practical subjects)
      //   6 periods → 3 doubles = 2+2+2 (intensive subjects)
      //   3 periods → 1 double + 1 single = 2+1 (moderate subjects)
      const doubleCount = Math.floor(periodsPerWeek / 2);
      const singleCount = periodsPerWeek % 2;

      // Create double period activities
      for (let i = 1; i <= doubleCount; i++) {
        const activity: Activity = {
          id: `${assignment.id}-double-${i}`,
          assignmentId: assignment.id,
          subjectId: assignment.subjectId,
          teacherId: assignment.teacherId,
          classId: assignment.classId,
          gradeId: gradeId,
          academicYearId: assignment.academicYearId,
          instanceNumber: i,
          isDoublePeriod: true,
          constraintScore,
          label: `${assignment.class.name}-${assignment.subject.code}-${i}-DOUBLE`,
        };

        activities.push(activity);
      }

      // Create remaining single period activities if odd number
      for (let i = 1; i <= singleCount; i++) {
        const activity: Activity = {
          id: `${assignment.id}-single-${i}`,
          assignmentId: assignment.id,
          subjectId: assignment.subjectId,
          teacherId: assignment.teacherId,
          classId: assignment.classId,
          gradeId: gradeId,
          academicYearId: assignment.academicYearId,
          instanceNumber: doubleCount + i,
          isDoublePeriod: false,
          constraintScore,
          label: `${assignment.class.name}-${assignment.subject.code}-${doubleCount + i}`,
        };

        activities.push(activity);
      }
    } else {
      // Generate single period activities
      for (let i = 1; i <= periodsPerWeek; i++) {
        const activity: Activity = {
          id: `${assignment.id}-${i}`,
          assignmentId: assignment.id,
          subjectId: assignment.subjectId,
          teacherId: assignment.teacherId,
          classId: assignment.classId,
          gradeId: gradeId,
          academicYearId: assignment.academicYearId,
          instanceNumber: i,
          isDoublePeriod: false,
          constraintScore,
          label: `${assignment.class.name}-${assignment.subject.code}-${i}`,
        };

        activities.push(activity);
      }
    }
  }

  // Sort by constraint score (most constrained first)
  activities.sort((a, b) => b.constraintScore - a.constraintScore);

  return activities;
}

/**
 * Calculate how many slots each teacher is available for
 */
function calculateTeacherAvailableSlots(
  availabilities: TeacherAvailability[],
  periodSlots: PeriodSlot[],
  config: SolverConfig
): Map<string, number> {
  const result = new Map<string, number>();

  // Get teaching periods (non-break)
  const teachingPeriods = periodSlots.filter(s => !s.isBreak);
  const totalPossibleSlots = teachingPeriods.length * config.schoolDays.length;

  // Group availabilities by teacher
  const byTeacher = new Map<string, TeacherAvailability[]>();
  for (const avail of availabilities) {
    const list = byTeacher.get(avail.teacherId) || [];
    list.push(avail);
    byTeacher.set(avail.teacherId, list);
  }

  // Calculate available slots per teacher
  for (const [teacherId, teacherAvails] of byTeacher) {
    // Count unavailable slots
    const unavailableCount = teacherAvails.filter(a => !a.isAvailable).length;
    result.set(teacherId, totalPossibleSlots - unavailableCount);
  }

  return result;
}

/**
 * Calculate constraint score for an assignment
 * Higher score = more constrained = place first
 *
 * This is the key heuristic that makes FET-style solvers efficient:
 * - Place the hardest activities first
 * - Reduces backtracking significantly
 */
function calculateConstraintScore(
  assignment: SubjectTeacherAssignment,
  periodsPerWeek: number,
  teacherAvailableSlots: number,
  teacherClassCount: number,
  requiresDouble: boolean
): number {
  let score = 0;

  // More periods = more constrained
  score += periodsPerWeek * 10;

  // Double periods are MORE constrained (need 2 consecutive free slots)
  if (requiresDouble) {
    score += 30; // Significant boost for double periods
  }

  // Fewer available slots = more constrained
  if (teacherAvailableSlots > 0) {
    score += Math.max(0, 50 - teacherAvailableSlots);
  } else {
    // Teacher has no availability info - assume fully available
    score += 0;
  }

  // Teacher with more classes = more constrained
  score += teacherClassCount * 5;

  return score;
}

/**
 * Group activities by class for easier processing
 */
export function groupActivitiesByClass(
  activities: Activity[]
): Map<string, Activity[]> {
  const result = new Map<string, Activity[]>();

  for (const activity of activities) {
    const list = result.get(activity.classId) || [];
    list.push(activity);
    result.set(activity.classId, list);
  }

  return result;
}

/**
 * Group activities by teacher for constraint checking
 */
export function groupActivitiesByTeacher(
  activities: Activity[]
): Map<string, Activity[]> {
  const result = new Map<string, Activity[]>();

  for (const activity of activities) {
    const list = result.get(activity.teacherId) || [];
    list.push(activity);
    result.set(activity.teacherId, list);
  }

  return result;
}

/**
 * Validate that all activities can theoretically be placed
 * (pre-flight check before solving)
 */
export function validateActivities(
  activities: Activity[],
  periodSlots: PeriodSlot[],
  config: SolverConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const teachingPeriods = periodSlots.filter(s => !s.isBreak);
  const slotsPerWeek = teachingPeriods.length * config.schoolDays.length;

  // Check class totals
  const byClass = groupActivitiesByClass(activities);
  for (const [classId, classActivities] of byClass) {
    // Count total period slots needed (doubles count as 2)
    const totalPeriodsNeeded = classActivities.reduce((sum, a) => {
      return sum + (a.isDoublePeriod ? 2 : 1);
    }, 0);

    if (totalPeriodsNeeded > slotsPerWeek) {
      errors.push(
        `Class ${classId} needs ${totalPeriodsNeeded} period slots but only ${slotsPerWeek} available`
      );
    }

    // Check per-day limits
    const perDayNeeded = Math.ceil(totalPeriodsNeeded / config.schoolDays.length);
    if (perDayNeeded > config.maxLessonsPerDayPerClass) {
      errors.push(
        `Class ${classId} needs ~${perDayNeeded} periods/day but max is ${config.maxLessonsPerDayPerClass}`
      );
    }
  }

  // Check teacher totals
  const byTeacher = groupActivitiesByTeacher(activities);
  for (const [teacherId, teacherActivities] of byTeacher) {
    const totalPeriodsNeeded = teacherActivities.reduce((sum, a) => {
      return sum + (a.isDoublePeriod ? 2 : 1);
    }, 0);

    if (totalPeriodsNeeded > slotsPerWeek) {
      errors.push(
        `Teacher ${teacherId} has ${totalPeriodsNeeded} period slots but only ${slotsPerWeek} available`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
