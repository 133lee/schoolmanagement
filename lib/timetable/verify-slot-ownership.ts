import { timetableSlotRepository } from "@/features/timetables/timetableSlot.repository";
import { teacherRepository } from "@/features/teachers/teacher.repository";
import { UnauthorizedError, NotFoundError, ValidationError } from "@/lib/errors";
import { DayOfWeek, Role } from "@/types/prisma-enums";

// JS Date#getDay() (0=Sunday..6=Saturday) -> DayOfWeek, weekends unmapped —
// mirrors JS_DAY_TO_KEY in app/(dashboard)/teacher/attendance/page.tsx.
const JS_DAY_TO_DAYOFWEEK: Record<number, DayOfWeek | undefined> = {
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
};

export interface SlotOwnershipContext {
  userId: string;
  role: string;
  teacherProfileId?: string;
}

/**
 * Verifies a timetable slot exists and, for a plain TEACHER caller, that
 * it's genuinely theirs and that `date` actually falls on the slot's
 * scheduled day. ADMIN/HEAD_TEACHER/DEPUTY_HEAD bypass the ownership+day
 * check (administrative override) but the slot is still fetched/validated
 * to exist. Shared by attendance marking and lesson logging — both need the
 * identical "is this really your period, on this day" check.
 *
 * Returns the slot so callers that need its fields (teacherId, class,
 * subject) don't have to re-fetch it.
 */
export async function verifySlotOwnership(
  timetableSlotId: string,
  date: Date,
  context: SlotOwnershipContext
) {
  const slot = await timetableSlotRepository.findById(timetableSlotId);
  if (!slot) throw new NotFoundError("Timetable slot not found");

  if (context.role !== Role.TEACHER) return slot;

  const teacherProfileId =
    context.teacherProfileId ?? (await teacherRepository.findByUserId(context.userId))?.id;
  if (!teacherProfileId || slot.teacherId !== teacherProfileId) {
    throw new UnauthorizedError("This period is not on your timetable");
  }

  const expectedDay = JS_DAY_TO_DAYOFWEEK[date.getDay()];
  if (!expectedDay || slot.dayOfWeek !== expectedDay) {
    throw new ValidationError("This date does not match the scheduled day for this period");
  }

  return slot;
}
