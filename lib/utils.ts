import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a teacher's name for display on a timetable — "Lastname F.". Never
 * the staff number, which means nothing to a student or parent reading it.
 */
export function formatTeacherLabel(
  teacher: { firstName?: string | null; lastName?: string | null; staffNumber?: string | null } | null | undefined
): string {
  if (!teacher) return "";
  const lastName = teacher.lastName?.trim() ?? "";
  const firstInitial = teacher.firstName?.trim().charAt(0).toUpperCase() ?? "";
  if (lastName && firstInitial) return `${lastName} ${firstInitial}.`;
  if (lastName) return lastName;
  if (teacher.staffNumber) return teacher.staffNumber.toUpperCase();
  return "";
}

/**
 * Compact class label — the one convention every class-selection UI in the
 * app should use (filters, mobile cards, report cards, table columns):
 * "12A" for grade-numbered classes (grade's number directly against the
 * section letter, no space, no "Grade" word — "Grade 12" + "A" → "12A"),
 * "F1-B" for Form-named classes, which already carry their own identifying
 * prefix and are returned as-is.
 */
export function formatCompactClassLabel(
  gradeName: string | null | undefined,
  className: string
): string {
  if (/^f[1-5]\b/i.test(className)) return className;
  const gradeNumber = gradeName?.match(/\d+/)?.[0];
  if (!gradeNumber || className.trim().startsWith(gradeNumber)) return className;
  return `${gradeNumber}${className}`;
}

/**
 * Best-effort human-readable message from a caught value. `catch` variables
 * are `unknown`, so a bare `error.message` doesn't typecheck — and anything
 * can be thrown, not just an Error. Falls back to `fallback` when there's no
 * usable message.
 */
export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred"): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}
