/**
 * Date Utilities
 *
 * Provides consistent date handling utilities across the application.
 *
 * IMPORTANT: All attendance-related dates MUST use UTC normalization to avoid
 * timezone-related bugs. When marking attendance at 11:30 PM local time,
 * the date should represent the current local day, not the next day in UTC.
 */

/**
 * Normalizes a date to UTC midnight.
 *
 * This function takes any date/time and returns a new Date object set to
 * midnight (00:00:00.000) in UTC, preserving the calendar date components.
 *
 * Why UTC? Storing dates as UTC midnight ensures:
 * 1. Consistent date representation across different timezones
 * 2. No daylight saving time issues
 * 3. Predictable date arithmetic
 * 4. Simplified querying and comparison
 *
 * @param date - The date to normalize (can be Date object or ISO string)
 * @returns A new Date object set to midnight UTC
 *
 * @example
 * // User marks attendance at 11:30 PM on Jan 26, 2024
 * const inputDate = new Date('2024-01-26T23:30:00+02:00');
 * const normalized = normalizeToUtcMidnight(inputDate);
 * // Returns: 2024-01-26T00:00:00.000Z (not 2024-01-27)
 */
export function normalizeToUtcMidnight(date: Date | string): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date;

  return new Date(Date.UTC(
    inputDate.getUTCFullYear(),
    inputDate.getUTCMonth(),
    inputDate.getUTCDate(),
    0, 0, 0, 0
  ));
}

/**
 * Normalizes a date to UTC end of day (23:59:59.999).
 *
 * Useful for date range queries where you want to include the entire day.
 *
 * @param date - The date to normalize
 * @returns A new Date object set to end of day UTC
 */
export function normalizeToUtcEndOfDay(date: Date | string): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date;

  return new Date(Date.UTC(
    inputDate.getUTCFullYear(),
    inputDate.getUTCMonth(),
    inputDate.getUTCDate(),
    23, 59, 59, 999
  ));
}

/**
 * Gets today's date normalized to UTC midnight.
 *
 * Use this when you need "today" for attendance or other date-based operations.
 *
 * @returns Today's date at UTC midnight
 */
export function getTodayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
}

/**
 * Extracts the day of month from a UTC-normalized date.
 *
 * Use this when extracting day numbers from attendance dates stored in the database.
 *
 * @param date - The UTC-normalized date
 * @returns Day of month (1-31)
 */
export function getUtcDayOfMonth(date: Date): number {
  return date.getUTCDate();
}

/**
 * Creates a date range for a specific month in UTC.
 *
 * @param year - The year (e.g., 2024)
 * @param month - The month (0-11, JavaScript Date convention)
 * @returns Object with startDate (midnight on first day) and endDate (end of last day)
 */
export function getUtcMonthDateRange(year: number, month: number): {
  startDate: Date;
  endDate: Date;
} {
  const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  return { startDate, endDate };
}
