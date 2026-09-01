/**
 * Gap Repair Pass
 *
 * The main solver places activities one at a time and never revisits a
 * placement once it's made — so if a class ends up with a period sitting
 * empty in the middle of an otherwise-busy day (typically because the
 * subject that could fill it has a teacher who's booked with a *different*
 * class at that exact time), nothing ever tries to fix it afterwards.
 *
 * This runs once after the main solve completes. For every class-day gap,
 * it looks for a same-class block on a *different* day with the same span
 * (single or double period) and swaps their day/period identities — moving
 * the donor block into the gap, and the block that was causing the gap out
 * to the donor's old slot. That's safe by construction:
 *   - The gap's day: the donor block exactly fills the gap, and the block
 *     that used to sit after the gap (which must be the day's *last* block
 *     for this to apply) is gone — the day is now contiguous, just shorter.
 *   - The donor's day: the incoming block takes the exact slot (same day,
 *     same period, same span) the donor block vacated — no structural
 *     change, so it can't create a new gap there.
 * Both teachers are checked for availability at the new slot (across every
 * class, not just this one) before the swap is made, and same-subject-
 * per-day and double-period/break rules are re-checked at the destination.
 */

import { Placement, SolverConfig, DayOfWeek, PeriodSlot } from './types';

function blockPeriods(p: Placement): number[] {
  return p.activity.isDoublePeriod ? [p.periodNumber, p.periodNumber + 1] : [p.periodNumber];
}

function teacherFreeAt(
  allPlacements: Placement[],
  teacherId: string,
  day: DayOfWeek,
  startPeriod: number,
  span: number,
  excludeActivityIds: Set<string>
): boolean {
  const needed = new Set(Array.from({ length: span }, (_, i) => startPeriod + i));
  for (const p of allPlacements) {
    if (excludeActivityIds.has(p.activityId)) continue;
    if (p.activity.teacherId !== teacherId || p.dayOfWeek !== day) continue;
    if (blockPeriods(p).some(per => needed.has(per))) return false;
  }
  return true;
}

function teacherDayLoad(
  allPlacements: Placement[],
  teacherId: string,
  day: DayOfWeek,
  excludeActivityIds: Set<string>
): number {
  let count = 0;
  for (const p of allPlacements) {
    if (excludeActivityIds.has(p.activityId)) continue;
    if (p.activity.teacherId === teacherId && p.dayOfWeek === day) {
      count += p.activity.isDoublePeriod ? 2 : 1;
    }
  }
  return count;
}

export function repairGaps(
  placements: Placement[],
  config: SolverConfig,
  periodSlots: PeriodSlot[]
): { placements: Placement[]; repairCount: number } {
  const totalPeriods = periodSlots.filter(p => !p.isBreak).length || config.totalPeriodsPerDay;
  let current = [...placements];
  let repairCount = 0;
  const MAX_PASSES = 50;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let repairedThisPass = false;

    const byClass = new Map<string, Placement[]>();
    for (const p of current) {
      const list = byClass.get(p.activity.classId) ?? [];
      list.push(p);
      byClass.set(p.activity.classId, list);
    }

    outer: for (const classPlacements of byClass.values()) {
      const byDay = new Map<DayOfWeek, Placement[]>();
      for (const p of classPlacements) {
        const list = byDay.get(p.dayOfWeek) ?? [];
        list.push(p);
        byDay.set(p.dayOfWeek, list);
      }
      for (const list of byDay.values()) list.sort((a, b) => a.periodNumber - b.periodNumber);

      for (const day of config.schoolDays) {
        const dayPlacements = byDay.get(day);
        if (!dayPlacements || dayPlacements.length === 0) continue;

        const occupied = new Set<number>();
        for (const p of dayPlacements) for (const per of blockPeriods(p)) occupied.add(per);
        const sorted = [...occupied].sort((a, b) => a - b);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        let gapStart = -1;
        let gapEnd = -1;
        for (let per = first; per <= last; per++) {
          if (!occupied.has(per)) {
            if (gapStart === -1) gapStart = per;
            gapEnd = per;
          } else if (gapStart !== -1) {
            break;
          }
        }
        if (gapStart === -1) continue;

        const gapSpan = gapEnd - gapStart + 1;
        const gapBlock = dayPlacements.find(p => p.periodNumber === gapEnd + 1);
        if (!gapBlock) continue;

        const gapBlockPeriods = blockPeriods(gapBlock);
        if (Math.max(...gapBlockPeriods) !== last) continue; // only the safe last-block case
        if (gapBlockPeriods.length !== gapSpan) continue; // only exact-span swaps

        for (const donorDay of config.schoolDays) {
          if (donorDay === day) continue;
          const donorList = byDay.get(donorDay);
          if (!donorList || donorList.length === 0) continue;

          for (const donorBlock of donorList) {
            const donorPeriods = blockPeriods(donorBlock);
            if (donorPeriods.length !== gapSpan) continue;

            // A double period can't land on the period right before the break.
            if (donorBlock.activity.isDoublePeriod && gapStart === config.breakAfterPeriod) continue;
            if (gapBlock.activity.isDoublePeriod && donorBlock.periodNumber === config.breakAfterPeriod) continue;
            if (gapStart + gapSpan - 1 > totalPeriods || donorBlock.periodNumber + gapSpan - 1 > totalPeriods) continue;

            const subjectAlreadyOnGapDay = dayPlacements.some(
              p => p !== gapBlock && p.activity.subjectId === donorBlock.activity.subjectId
            );
            if (subjectAlreadyOnGapDay) continue;

            const subjectAlreadyOnDonorDay = donorList.some(
              p => p !== donorBlock && p.activity.subjectId === gapBlock.activity.subjectId
            );
            if (subjectAlreadyOnDonorDay) continue;

            const excl = new Set([gapBlock.activityId, donorBlock.activityId]);

            if (!teacherFreeAt(current, donorBlock.activity.teacherId, day, gapStart, gapSpan, excl)) continue;
            if (!teacherFreeAt(current, gapBlock.activity.teacherId, donorDay, donorBlock.periodNumber, gapSpan, excl)) continue;

            const donorTeacherNewLoad =
              teacherDayLoad(current, donorBlock.activity.teacherId, day, excl) + gapSpan;
            const gapTeacherNewLoad =
              teacherDayLoad(current, gapBlock.activity.teacherId, donorDay, excl) + gapSpan;
            if (donorTeacherNewLoad > config.maxLessonsPerDayPerTeacher) continue;
            if (gapTeacherNewLoad > config.maxLessonsPerDayPerTeacher) continue;

            const gapBlockOldDay = gapBlock.dayOfWeek;
            const gapBlockOldPeriod = gapBlock.periodNumber;
            const donorBlockOldDay = donorBlock.dayOfWeek;
            const donorBlockOldPeriod = donorBlock.periodNumber;

            const donorSlotTime = periodSlots.find(s => s.periodNumber === donorBlockOldPeriod);
            const gapSlotTime = periodSlots.find(s => s.periodNumber === gapStart);
            if (!donorSlotTime || !gapSlotTime) continue;

            current = current.map(p => {
              if (p.activityId === gapBlock.activityId && p.dayOfWeek === gapBlockOldDay && p.periodNumber === gapBlockOldPeriod) {
                return {
                  ...p,
                  dayOfWeek: donorBlockOldDay,
                  periodNumber: donorBlockOldPeriod,
                  startTime: donorSlotTime.startTime,
                  endTime: donorSlotTime.endTime,
                };
              }
              if (p.activityId === donorBlock.activityId && p.dayOfWeek === donorBlockOldDay && p.periodNumber === donorBlockOldPeriod) {
                return {
                  ...p,
                  dayOfWeek: day,
                  periodNumber: gapStart,
                  startTime: gapSlotTime.startTime,
                  endTime: gapSlotTime.endTime,
                };
              }
              return p;
            });

            repairCount++;
            repairedThisPass = true;
            break outer;
          }
        }
      }
    }

    if (!repairedThisPass) break;
  }

  return { placements: current, repairCount };
}
