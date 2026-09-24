import { AttendanceStatus } from "@/types/prisma-enums";

export interface AttendanceSummary {
  /** Distinct days on which the student has at least one attendance record. */
  totalDays: number;
  /** Days counted present (PRESENT or LATE). */
  daysPresent: number;
  /** Recorded days that were not present (ABSENT or EXCUSED). */
  daysAbsent: number;
}

/**
 * Collapses raw attendance rows into per-DAY counts: one outcome per date,
 * present if ANY record that date is PRESENT or LATE, otherwise absent
 * (ABSENT or EXCUSED). Dates are bucketed by their UTC calendar day, the same
 * way the attendance analytics do.
 *
 * Pass ONE student's rows, and decide which register they come from BEFORE
 * calling: this function doesn't distinguish the daily register from period
 * registers. Fed both, several period rows on one date would fold into one
 * day — fine for counting, but it would let a subject teacher's lesson mark
 * decide whether the student was "present" that day. The report card passes
 * the daily register only.
 */
export function summarizeAttendance(
  records: ReadonlyArray<{ date: Date; status: AttendanceStatus }>
): AttendanceSummary {
  const allDays = new Set<string>();
  const presentDays = new Set<string>();

  for (const record of records) {
    const day = record.date.toISOString().split("T")[0];
    allDays.add(day);
    if (record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE) {
      presentDays.add(day);
    }
  }

  return {
    totalDays: allDays.size,
    daysPresent: presentDays.size,
    daysAbsent: allDays.size - presentDays.size,
  };
}
