/**
 * Database Writer
 * Converts solver output to timetable_slots table entries
 * Handles double periods by creating entries for both consecutive slots
 */

import {
  Placement,
  SolverOutput,
  TimetableSlotEntry,
  DayOfWeek,
  PeriodSlot,
} from './types';

// ============================================
// OUTPUT CONVERSION
// ============================================

/**
 * Calculate end time for a double period
 * For a double period starting at slot with endTime "09:30",
 * we need to find the next slot's endTime
 */
function calculateDoublePeriodEndTime(
  startPeriodNumber: number,
  periodSlots: PeriodSlot[]
): string {
  const nextSlot = periodSlots.find(s => s.periodNumber === startPeriodNumber + 1);
  return nextSlot?.endTime || '';
}

/**
 * Convert solver placements to timetable_slots entries
 * For double periods, creates TWO entries (one for each consecutive slot)
 */
export function toTimetableSlotEntries(
  placements: Placement[],
  academicYearId: string,
  periodSlots: PeriodSlot[]
): TimetableSlotEntry[] {
  const entries: TimetableSlotEntry[] = [];

  for (const p of placements) {
    if (p.activity.isDoublePeriod) {
      // Create entry for first slot
      entries.push({
        id: `${p.activityId}-slot-1`,
        classId: p.activity.classId,
        subjectId: p.activity.subjectId,
        teacherId: p.activity.teacherId,
        academicYearId,
        dayOfWeek: p.dayOfWeek,
        periodNumber: p.periodNumber,
        startTime: p.startTime,
        endTime: p.endTime,
      });

      // Create entry for second consecutive slot
      const nextPeriod = periodSlots.find(
        s => s.periodNumber === p.periodNumber + 1 && !s.isBreak
      );

      if (nextPeriod) {
        entries.push({
          id: `${p.activityId}-slot-2`,
          classId: p.activity.classId,
          subjectId: p.activity.subjectId,
          teacherId: p.activity.teacherId,
          academicYearId,
          dayOfWeek: p.dayOfWeek,
          periodNumber: nextPeriod.periodNumber,
          startTime: nextPeriod.startTime,
          endTime: nextPeriod.endTime,
        });
      }
    } else {
      // Single period - create one entry
      entries.push({
        id: p.activityId,
        classId: p.activity.classId,
        subjectId: p.activity.subjectId,
        teacherId: p.activity.teacherId,
        academicYearId,
        dayOfWeek: p.dayOfWeek,
        periodNumber: p.periodNumber,
        startTime: p.startTime,
        endTime: p.endTime,
      });
    }
  }

  return entries;
}

/**
 * Generate Prisma createMany data for timetable_slots
 * NOTE: Prisma's createMany doesn't return IDs, so we generate them
 */
export function generateTimetableSlotCreateData(
  entries: TimetableSlotEntry[]
): {
  data: {
    id: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    academicYearId: string;
    dayOfWeek: DayOfWeek;
    periodNumber: number;
    startTime: string;
    endTime: string;
    room?: string | null;
  }[];
} {
  return {
    data: entries.map(e => ({
      id: e.id,
      classId: e.classId,
      subjectId: e.subjectId,
      teacherId: e.teacherId,
      academicYearId: e.academicYearId,
      dayOfWeek: e.dayOfWeek,
      periodNumber: e.periodNumber,
      startTime: e.startTime,
      endTime: e.endTime,
      room: e.room || null,
      updatedAt: new Date(),
    })),
  };
}

// ============================================
// PRISMA INTEGRATION
// ============================================

/**
 * Generate code snippet for saving timetable with Prisma
 * This is a template - actual implementation would import prisma
 */
export function generatePrismaOperations(
  output: SolverOutput,
  academicYearId: string,
  periodSlots: PeriodSlot[]
): string {
  const entries = toTimetableSlotEntries(output.placements, academicYearId, periodSlots);

  return `
// Generated Prisma operations for timetable
// Copy this to your API route or server action

import { prisma } from '@/lib/db/prisma';

export async function saveTimetable() {
  // Clear existing timetable for this academic year
  await prisma.timetableSlot.deleteMany({
    where: { academicYearId: '${academicYearId}' }
  });

  // Insert new timetable entries
  await prisma.timetableSlot.createMany({
    data: ${JSON.stringify(entries, null, 2)}
  });

  return {
    totalSlots: ${entries.length},
    placements: ${output.placements.length},
    doublePeriods: ${output.stats.doublePeriodCount}
  };
}
`;
}

// ============================================
// REPORT GENERATION
// ============================================

/**
 * Generate a summary report of the timetable
 */
export function generateReport(output: SolverOutput): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '                    TIMETABLE GENERATION REPORT                 ',
    '═══════════════════════════════════════════════════════════════',
    '',
    `Status: ${output.success ? '✓ SUCCESS' : '✗ INCOMPLETE'}`,
    '',
    '─── Statistics ───────────────────────────────────────────────',
    `Total activities:    ${output.stats.totalActivities}`,
    `Placed activities:   ${output.stats.placedActivities}`,
    `Unplaced activities: ${output.stats.unplacedActivities}`,
    `Double periods:      ${output.stats.doublePeriodCount}`,
    `Attempts:            ${output.stats.attempts}`,
    `Backtracks:          ${output.stats.backtrackCount}`,
    `Restarts:            ${output.stats.restartCount}`,
    `Duration:            ${output.stats.duration}ms`,
    '',
  ];

  if (output.errors.length > 0) {
    lines.push('─── Errors ───────────────────────────────────────────────────');
    for (const error of output.errors) {
      lines.push(`  ✗ ${error}`);
    }
    lines.push('');
  }

  if (output.warnings.length > 0) {
    lines.push('─── Warnings ─────────────────────────────────────────────────');
    for (const warning of output.warnings) {
      lines.push(`  ⚠ ${warning}`);
    }
    lines.push('');
  }

  if (output.unplacedActivities.length > 0) {
    lines.push('─── Unplaced Activities ──────────────────────────────────────');
    for (const activity of output.unplacedActivities) {
      lines.push(`  • ${activity.label} ${activity.isDoublePeriod ? '(DOUBLE)' : ''}`);
    }
    lines.push('');
  }

  // Group placements by class
  const byClass = new Map<string, Placement[]>();
  for (const placement of output.placements) {
    const list = byClass.get(placement.activity.classId) || [];
    list.push(placement);
    byClass.set(placement.activity.classId, list);
  }

  lines.push('─── Placements by Class ──────────────────────────────────────');
  for (const [classId, placements] of byClass) {
    const doubleCount = placements.filter(p => p.activity.isDoublePeriod).length;
    const singleCount = placements.length - doubleCount;
    lines.push(`  ${classId}: ${placements.length} lessons (${singleCount} single, ${doubleCount} double)`);
  }
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Generate a visual timetable grid for a single class
 */
export function generateClassGrid(
  classId: string,
  placements: Placement[],
  periodSlots: PeriodSlot[],
  days: DayOfWeek[]
): string {
  const classplacements = placements.filter(p => p.activity.classId === classId);
  const sortedPeriods = [...periodSlots].sort((a, b) => a.periodNumber - b.periodNumber);

  // Build grid
  const grid: Map<number, Map<DayOfWeek, string>> = new Map();
  for (const period of sortedPeriods) {
    grid.set(period.periodNumber, new Map());
  }

  for (const p of classplacements) {
    const periodRow = grid.get(p.periodNumber);
    if (periodRow) {
      const label = p.activity.isDoublePeriod
        ? `${p.activity.label} [1/2]`
        : p.activity.label;
      periodRow.set(p.dayOfWeek, label);

      // For doubles, mark the second period too
      if (p.activity.isDoublePeriod) {
        const nextPeriodRow = grid.get(p.periodNumber + 1);
        if (nextPeriodRow) {
          nextPeriodRow.set(p.dayOfWeek, `${p.activity.label} [2/2]`);
        }
      }
    }
  }

  // Generate output
  const lines: string[] = [];
  const colWidth = 20;

  // Header
  let header = 'Period'.padEnd(10);
  for (const day of days) {
    header += day.substring(0, 3).padEnd(colWidth);
  }
  lines.push(header);
  lines.push('─'.repeat(header.length));

  // Rows
  for (const period of sortedPeriods) {
    if (period.isBreak) {
      let row = `P${period.periodNumber} BREAK`.padEnd(10);
      for (const day of days) {
        row += '--- BREAK ---'.padEnd(colWidth);
      }
      lines.push(row);
      continue;
    }

    let row = `P${period.periodNumber}`.padEnd(10);
    const periodRow = grid.get(period.periodNumber)!;
    for (const day of days) {
      const activity = periodRow.get(day) || '-';
      row += activity.substring(0, colWidth - 1).padEnd(colWidth);
    }
    lines.push(row);
  }

  return lines.join('\n');
}
