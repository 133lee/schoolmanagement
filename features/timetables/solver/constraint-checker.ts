/**
 * Constraint Checker with Double Period Support
 * Validates placements against hard and soft constraints
 */

import {
  Activity,
  Slot,
  TimetableState,
  HardConstraintResult,
  SoftConstraintResult,
  TeacherAvailability,
  PeriodSlot,
  DayOfWeek,
  SolverConfig,
} from './types';

// ============================================
// HARD CONSTRAINTS (must never break)
// ============================================

/**
 * Check if a teacher is free at a given slot
 * For double periods, checks both consecutive slots
 */
export function checkTeacherFree(
  activity: Activity,
  slot: Slot,
  state: TimetableState
): HardConstraintResult {
  const teacherDaySchedule = state.teacherSchedule
    .get(activity.teacherId)
    ?.get(slot.dayOfWeek);

  // Check first slot
  if (teacherDaySchedule?.has(slot.periodNumber)) {
    const conflictingActivityId = teacherDaySchedule.get(slot.periodNumber);
    return {
      satisfied: false,
      reason: `Teacher already has activity ${conflictingActivityId} at period ${slot.periodNumber}`,
    };
  }

  // For double periods, check the next consecutive slot
  if (activity.isDoublePeriod) {
    const nextPeriod = slot.periodNumber + 1;
    if (teacherDaySchedule?.has(nextPeriod)) {
      const conflictingActivityId = teacherDaySchedule.get(nextPeriod);
      return {
        satisfied: false,
        reason: `Teacher already has activity ${conflictingActivityId} at period ${nextPeriod} (needed for double)`,
      };
    }
  }

  return { satisfied: true };
}

/**
 * Check if a class is free at a given slot
 * For double periods, checks both consecutive slots
 */
export function checkClassFree(
  activity: Activity,
  slot: Slot,
  state: TimetableState
): HardConstraintResult {
  const classDaySchedule = state.classSchedule
    .get(activity.classId)
    ?.get(slot.dayOfWeek);

  // Check first slot
  if (classDaySchedule?.has(slot.periodNumber)) {
    const conflictingActivityId = classDaySchedule.get(slot.periodNumber);
    return {
      satisfied: false,
      reason: `Class already has activity ${conflictingActivityId} at period ${slot.periodNumber}`,
    };
  }

  // For double periods, check the next consecutive slot
  if (activity.isDoublePeriod) {
    const nextPeriod = slot.periodNumber + 1;
    if (classDaySchedule?.has(nextPeriod)) {
      const conflictingActivityId = classDaySchedule.get(nextPeriod);
      return {
        satisfied: false,
        reason: `Class already has activity ${conflictingActivityId} at period ${nextPeriod} (needed for double)`,
      };
    }
  }

  return { satisfied: true };
}

/**
 * Check if double period has room for both consecutive slots
 * For singles, this always passes
 */
export function checkDoublePeriodFits(
  activity: Activity,
  slot: Slot,
  config: SolverConfig
): HardConstraintResult {
  if (!activity.isDoublePeriod) {
    return { satisfied: true };
  }

  // Check if there's a next period available
  const nextPeriod = slot.periodNumber + 1;
  if (nextPeriod > config.totalPeriodsPerDay) {
    return {
      satisfied: false,
      reason: `Double period cannot fit - period ${slot.periodNumber} is too late in the day`,
    };
  }

  return { satisfied: true };
}

/**
 * Check if teacher is available (based on TeacherAvailability records)
 * For double periods, checks both consecutive slots
 */
export function checkTeacherAvailability(
  activity: Activity,
  slot: Slot,
  availabilities: Map<string, Map<DayOfWeek, Set<number>>> // teacherId -> day -> unavailable periodNumbers
): HardConstraintResult {
  const teacherUnavailable = availabilities
    .get(activity.teacherId)
    ?.get(slot.dayOfWeek)
    ?.has(slot.periodNumber);

  if (teacherUnavailable) {
    return {
      satisfied: false,
      reason: `Teacher is marked unavailable at period ${slot.periodNumber}`,
    };
  }

  // For double periods, check next slot availability
  if (activity.isDoublePeriod) {
    const nextPeriodUnavailable = availabilities
      .get(activity.teacherId)
      ?.get(slot.dayOfWeek)
      ?.has(slot.periodNumber + 1);

    if (nextPeriodUnavailable) {
      return {
        satisfied: false,
        reason: `Teacher is marked unavailable at period ${slot.periodNumber + 1} (needed for double)`,
      };
    }
  }

  return { satisfied: true };
}

/**
 * Check max lessons per day for class
 * For double periods, counts as 2 lessons
 */
export function checkClassMaxLessonsPerDay(
  activity: Activity,
  slot: Slot,
  state: TimetableState,
  config: SolverConfig
): HardConstraintResult {
  const currentCount = state.classLessonsPerDay
    .get(activity.classId)
    ?.get(slot.dayOfWeek) || 0;

  const neededSlots = activity.isDoublePeriod ? 2 : 1;

  if (currentCount + neededSlots > config.maxLessonsPerDayPerClass) {
    return {
      satisfied: false,
      reason: `Class has ${currentCount} lessons, adding ${neededSlots} would exceed max ${config.maxLessonsPerDayPerClass} for ${slot.dayOfWeek}`,
    };
  }

  return { satisfied: true };
}

/**
 * Check max lessons per day for teacher
 * For double periods, counts as 2 lessons
 */
export function checkTeacherMaxLessonsPerDay(
  activity: Activity,
  slot: Slot,
  state: TimetableState,
  config: SolverConfig
): HardConstraintResult {
  const currentCount = state.teacherLessonsPerDay
    .get(activity.teacherId)
    ?.get(slot.dayOfWeek) || 0;

  const neededSlots = activity.isDoublePeriod ? 2 : 1;

  if (currentCount + neededSlots > config.maxLessonsPerDayPerTeacher) {
    return {
      satisfied: false,
      reason: `Teacher has ${currentCount} lessons, adding ${neededSlots} would exceed max ${config.maxLessonsPerDayPerTeacher} for ${slot.dayOfWeek}`,
    };
  }

  return { satisfied: true };
}

/**
 * Run all hard constraint checks
 */
export function checkAllHardConstraints(
  activity: Activity,
  slot: Slot,
  state: TimetableState,
  availabilities: Map<string, Map<DayOfWeek, Set<number>>>,
  config: SolverConfig
): HardConstraintResult {
  const checks = [
    checkDoublePeriodFits(activity, slot, config),
    checkTeacherFree(activity, slot, state),
    checkClassFree(activity, slot, state),
    checkTeacherAvailability(activity, slot, availabilities),
    checkClassMaxLessonsPerDay(activity, slot, state, config),
    checkTeacherMaxLessonsPerDay(activity, slot, state, config),
  ];

  for (const check of checks) {
    if (!check.satisfied) {
      return check;
    }
  }

  return { satisfied: true };
}

// ============================================
// SOFT CONSTRAINTS (minimize violations)
// ============================================

/**
 * Prefer spreading subjects across the week
 * Penalize if this subject already has a lesson on this day
 */
export function scoreSubjectSpread(
  activity: Activity,
  slot: Slot,
  state: TimetableState
): SoftConstraintResult {
  // Check if this subject already has a lesson on this day for this class
  const classSchedule = state.classSchedule.get(activity.classId);
  if (!classSchedule) {
    return { score: 100 };
  }

  const daySchedule = classSchedule.get(slot.dayOfWeek);
  if (!daySchedule) {
    return { score: 100 };
  }

  // Count how many times this subject appears on this day
  let subjectCountOnDay = 0;
  for (const [, placedActivityId] of daySchedule) {
    // We need the activity to check its subject
    const placement = state.placements.find(p => p.activityId === placedActivityId);
    if (placement && placement.activity.subjectId === activity.subjectId) {
      subjectCountOnDay++;
    }
  }

  if (subjectCountOnDay === 0) {
    return { score: 100, reason: 'No same subject on this day - good' };
  } else if (subjectCountOnDay === 1) {
    return { score: 50, reason: 'One same subject already on this day' };
  } else {
    return { score: 20, reason: `${subjectCountOnDay} same subject lessons already on this day` };
  }
}

/**
 * Prefer morning slots for core subjects
 * For double periods, only considers the first slot
 */
export function scoreMorningPreference(
  activity: Activity,
  slot: Slot,
  config: SolverConfig
): SoftConstraintResult {
  if (!config.preferMorningForCore) {
    return { score: 100 };
  }

  const isCore = config.coreSubjectIds.includes(activity.subjectId);
  if (!isCore) {
    return { score: 100, reason: 'Not a core subject' };
  }

  // Period number is effectively the "order" in the day
  const totalPeriods = config.totalPeriodsPerDay;
  const earlyMorning = Math.ceil(totalPeriods * 0.25);
  const midMorning = Math.ceil(totalPeriods * 0.5);
  const afternoon = Math.ceil(totalPeriods * 0.75);

  if (slot.periodNumber <= earlyMorning) {
    return { score: 100, reason: 'Core subject in early morning - excellent' };
  } else if (slot.periodNumber <= midMorning) {
    return { score: 80, reason: 'Core subject in mid-morning' };
  } else if (slot.periodNumber <= afternoon) {
    return { score: 60, reason: 'Core subject in afternoon' };
  } else {
    return { score: 40, reason: 'Core subject in late afternoon' };
  }
}

/**
 * Prefer balanced teacher workload across the week
 */
export function scoreTeacherBalance(
  activity: Activity,
  slot: Slot,
  state: TimetableState,
  config: SolverConfig
): SoftConstraintResult {
  const teacherDays = state.teacherLessonsPerDay.get(activity.teacherId);
  if (!teacherDays) {
    return { score: 100 };
  }

  // Calculate current variance
  const counts: number[] = [];
  for (const day of config.schoolDays) {
    counts.push(teacherDays.get(day) || 0);
  }

  const currentDayCount = teacherDays.get(slot.dayOfWeek) || 0;
  const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;

  // If this day is already above average, penalize
  if (currentDayCount > avgCount + 1) {
    return { score: 60, reason: 'Teacher already has many lessons this day' };
  } else if (currentDayCount > avgCount) {
    return { score: 80, reason: 'Teacher slightly busy this day' };
  }

  return { score: 100, reason: 'Good teacher balance' };
}

/**
 * Avoid consecutive days for same subject (if configured)
 */
export function scoreAvoidConsecutiveDays(
  activity: Activity,
  slot: Slot,
  state: TimetableState,
  config: SolverConfig
): SoftConstraintResult {
  if (!config.avoidConsecutiveDays) {
    return { score: 100 };
  }

  const dayOrder: DayOfWeek[] = config.schoolDays;
  const currentDayIndex = dayOrder.indexOf(slot.dayOfWeek);
  const adjacentDays: DayOfWeek[] = [];

  if (currentDayIndex > 0) {
    adjacentDays.push(dayOrder[currentDayIndex - 1]);
  }
  if (currentDayIndex < dayOrder.length - 1) {
    adjacentDays.push(dayOrder[currentDayIndex + 1]);
  }

  // Check if this subject is on adjacent days for this class
  const classSchedule = state.classSchedule.get(activity.classId);
  if (!classSchedule) {
    return { score: 100 };
  }

  for (const adjDay of adjacentDays) {
    const daySchedule = classSchedule.get(adjDay);
    if (!daySchedule) continue;

    for (const [, placedActivityId] of daySchedule) {
      const placement = state.placements.find(p => p.activityId === placedActivityId);
      if (placement && placement.activity.subjectId === activity.subjectId) {
        return { score: 50, reason: `Same subject on adjacent day (${adjDay})` };
      }
    }
  }

  return { score: 100, reason: 'No consecutive days' };
}

/**
 * Avoid placing same subject at same time slot on different days
 * Promotes time slot variety across the week
 */
export function scoreAvoidSameTimeSlot(
  activity: Activity,
  slot: Slot,
  state: TimetableState,
  config: SolverConfig
): SoftConstraintResult {
  const classSchedule = state.classSchedule.get(activity.classId);
  if (!classSchedule) {
    return { score: 100 };
  }

  // Count how many times this subject appears at this period number on other days
  let sameTimeSlotCount = 0;

  for (const day of config.schoolDays) {
    if (day === slot.dayOfWeek) continue; // Skip current day

    const daySchedule = classSchedule.get(day);
    if (!daySchedule) continue;

    // Check if this period number is occupied by the same subject
    const placedActivityId = daySchedule.get(slot.periodNumber);
    if (placedActivityId) {
      const placement = state.placements.find(p => p.activityId === placedActivityId);
      if (placement && placement.activity.subjectId === activity.subjectId) {
        sameTimeSlotCount++;
      }
    }
  }

  // Heavy penalty for repeating time slots
  if (sameTimeSlotCount === 0) {
    return { score: 100, reason: 'No same subject at this time on other days - excellent' };
  } else if (sameTimeSlotCount === 1) {
    return { score: 40, reason: 'Same subject at this time on 1 other day' };
  } else if (sameTimeSlotCount === 2) {
    return { score: 20, reason: 'Same subject at this time on 2 other days' };
  } else {
    return { score: 5, reason: `Same subject at this time on ${sameTimeSlotCount} other days - very poor` };
  }
}

/**
 * Calculate total soft constraint score for a slot
 */
export function calculateSoftScore(
  activity: Activity,
  slot: Slot,
  state: TimetableState,
  config: SolverConfig
): number {
  const scores = [
    scoreSubjectSpread(activity, slot, state),
    scoreMorningPreference(activity, slot, config),
    scoreTeacherBalance(activity, slot, state, config),
    scoreAvoidConsecutiveDays(activity, slot, state, config),
    scoreAvoidSameTimeSlot(activity, slot, state, config), // NEW: Promote time slot variety
  ];

  // Weighted average - give more weight to time slot variety
  const weights = [1.0, 1.0, 1.0, 1.0, 2.0]; // Double weight for time slot variety
  const weightedTotal = scores.reduce((sum, s, i) => sum + s.score * weights[i], 0);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  return weightedTotal / totalWeight;
}

// ============================================
// AVAILABILITY PREPROCESSING
// ============================================

/**
 * Build lookup structure for teacher unavailabilities
 * Maps periodNumber instead of timeSlotId
 */
export function buildAvailabilityLookup(
  availabilities: TeacherAvailability[]
): Map<string, Map<DayOfWeek, Set<number>>> {
  const result = new Map<string, Map<DayOfWeek, Set<number>>>();

  for (const avail of availabilities) {
    if (avail.isAvailable) continue; // Only track unavailabilities

    if (!result.has(avail.teacherId)) {
      result.set(avail.teacherId, new Map());
    }

    const teacherMap = result.get(avail.teacherId)!;
    if (!teacherMap.has(avail.dayOfWeek)) {
      teacherMap.set(avail.dayOfWeek, new Set());
    }

    teacherMap.get(avail.dayOfWeek)!.add(avail.periodNumber);
  }

  return result;
}
