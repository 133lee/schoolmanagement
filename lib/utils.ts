import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a class label for display.
 * Form-based class names ("F1-A", "F2 B") become "Form 1A", "Form 2B" — the
 * grade's "Grade N" name is redundant once "Form" is spelled out. Plain
 * section names ("A", "B") are joined directly to the grade name with no
 * space — "Grade 10" + "A" → "Grade 10A".
 */
export function formatClassLabel(gradeName: string, className: string): string {
  const formMatch = className.trim().match(/^f(\d+)\s*-?\s*([a-z]+)$/i);
  if (formMatch) {
    return `Form ${formMatch[1]}${formMatch[2].toUpperCase()}`;
  }
  return `${gradeName}${className.trim()}`;
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
 * Compact class label for space-constrained UI (filters, mobile cards).
 * Form-based class names ("F1 A") are self-identifying and returned as-is.
 * Otherwise the class is prefixed with just the grade's number, not the
 * full "Grade" word — e.g. grade "Grade 10" + class "B" → "10 B".
 */
export function formatCompactClassLabel(
  gradeName: string | null | undefined,
  className: string
): string {
  if (/^f[1-5]\b/i.test(className)) return className;
  const gradeNumber = gradeName?.match(/\d+/)?.[0];
  if (!gradeNumber || className.trim().startsWith(gradeNumber)) return className;
  return `${gradeNumber} ${className}`;
}
