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

  // A double period can't start on the last period before the break — its
  // second slot would fall right after the break, so the two halves
  // wouldn't actually be consecutive class time.
  if (slot.periodNumber === config.breakAfterPeriod) {
    return {
      satisfied: false,
      reason: `Double period cannot fit - period ${slot.periodNumber} is immediately before the break`,
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
 * A class cannot have the same subject scheduled more than once per day —
 * whether the existing occurrence is a single or a double period. Without
 * this as a hard rule, the day-packing preference (scorePackedDay) can
 * out-vote the soft same-subject-spread preference (scoreSubjectSpread)
 * and stack multiple double-period blocks of the same subject back-to-back
 * on one day instead of spreading them across the week.
 */
export function checkSubjectNotAlreadyOnDay(
  activity: Activity,
  slot: Slot,
  state: TimetableState
): HardConstraintResult {
  const daySchedule = state.classSchedule.get(activity.classId)?.get(slot.dayOfWeek);
  if (!daySchedule) {
    return { satisfied: true };
  }

  for (const placedActivityId of daySchedule.values()) {
    const placement = state.placements.find(p => p.activityId === placedActivityId);
    if (placement && placement.activity.subjectId === activity.subjectId) {
      return {
        satisfied: false,
        reason: `${activity.subjectId} is already scheduled for this class on ${slot.dayOfWeek}`,
      };
    }
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
    checkSubjectNotAlreadyOnDay(activity, slot, state),
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
 * Reward placements that extend a class's already-occupied periods that day,
 * rather than starting a new isolated block elsewhere in the day. Without
 * this, a period can end up permanently empty for every class on every day
 * — not because anything blocks it, but because nothing in the scoring ever
 * favored filling it over starting a fresh block next to a more "preferred"
 * period (e.g. the double-period-heavy pairs that cluster on either side of
 * the break, stranding the single period right after it).
 * For double periods, the span's start and end are both compared against
 * their outside neighbor so a double is scored the same way a single is.
 */
export function scoreCompactDay(
  activity: Activity,
  slot: Slot,
  state: TimetableState
): SoftConstraintResult {
  const classDaySchedule = state.classSchedule
    .get(activity.classId)
    ?.get(slot.dayOfWeek);

  // Nothing placed yet this day — no gap to create either way.
  if (!classDaySchedule || classDaySchedule.size === 0) {
    return { score: 100, reason: 'First activity of the day for this class' };
  }

  const spanEnd = activity.isDoublePeriod ? slot.periodNumber + 1 : slot.periodNumber;
  const beforeOccupied = classDaySchedule.has(slot.periodNumber - 1);
  const afterOccupied = classDaySchedule.has(spanEnd + 1);

  if (beforeOccupied || afterOccupied) {
    return { score: 100, reason: 'Extends an existing block — keeps the day compact' };
  }

  return { score: 30, reason: 'Starts a new isolated block — risks leaving a gap' };
}

/**
 * For classes flagged in config.packedDayClassIds (Form 1/2 — lighter
 * curriculum than Grade 10-12), prefer filling a day the class has already
 * started up to packedDayTarget periods before spreading into a fresh,
 * untouched day. Without this, a light curriculum spreads thin across all
 * 5 days (e.g. one day at 6 periods, another at only 2) instead of packing
 * into fewer, fuller days.
 */
export function scorePackedDay(
  activity: Activity,
  slot: Slot,
  state: TimetableState,
  config: SolverConfig
): SoftConstraintResult {
  if (!config.packedDayClassIds.has(activity.classId)) {
    return { score: 100, reason: 'Not a packed-day class' };
  }

  const classSchedule = state.classSchedule.get(activity.classId);
  const thisDayCount = classSchedule?.get(slot.dayOfWeek)?.size ?? 0;

  // Already building on this day — always fine, including once it's past
  // the target (the hard capacity check elsewhere still applies).
  if (thisDayCount > 0) {
    return { score: 100, reason: 'Continuing an already-active day' };
  }

  // This day is untouched by the class so far. If another day the class
  // already uses is still under the pack target, prefer filling that one
  // first instead of spreading into this fresh day.
  if (classSchedule) {
    for (const day of config.schoolDays) {
      if (day === slot.dayOfWeek) continue;
      const count = classSchedule.get(day)?.size ?? 0;
      if (count > 0 && count < config.packedDayTarget) {
        return { score: 2, reason: 'Another day still needs packing before starting a new one' };
      }
    }
  }

  return { score: 100, reason: 'No partially-packed day available to prefer instead' };
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
    scoreAvoidSameTimeSlot(activity, slot, state, config), // Promote time slot variety
    scoreCompactDay(activity, slot, state), // Fill gaps instead of leaving periods empty
    scorePackedDay(activity, slot, state, config), // Pack Form classes' days before spreading thin
  ];

  // Weighted average - give more weight to time slot variety and day compactness
  const weights = [1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 5.0];
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
