/**
 * Timetable Solver
 * FET-style constraint-based timetable generation for Zambian schools
 * With support for consecutive double periods (80-minute practicals/labs)
 *
 * @author Kambombo Day Secondary School
 * @version 2.0.0 - Adapted for timetable_slots schema with double period support
 */

// Export types
export * from './types';

// Export activity generator
export {
  generateActivities,
  groupActivitiesByClass,
  groupActivitiesByTeacher,
  validateActivities,
} from './activity-generator';

// Export constraint checker
export {
  checkTeacherFree,
  checkClassFree,
  checkTeacherAvailability,
  checkDoublePeriodFits,
  checkClassMaxLessonsPerDay,
  checkTeacherMaxLessonsPerDay,
  checkAllHardConstraints,
  scoreSubjectSpread,
  scoreMorningPreference,
  scoreTeacherBalance,
  scoreAvoidConsecutiveDays,
  calculateSoftScore,
  buildAvailabilityLookup,
} from './constraint-checker';

// Export solver
export { solve, solveQuick } from './solver';

// Export database writer
export {
  toTimetableSlotEntries,
  generateTimetableSlotCreateData,
  generatePrismaOperations,
  generateReport,
  generateClassGrid,
} from './database-writer';
