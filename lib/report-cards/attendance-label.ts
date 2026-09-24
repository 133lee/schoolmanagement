/**
 * The text printed in a report card's ATTENDANCE cell — one place, so the
 * server PDF, the bulk download and the on-screen sheet can't disagree.
 *
 * "46 of 50 days (92%)" — days present out of days on which attendance was
 * recorded. A dash when nothing was recorded, matching how a missing mark
 * prints elsewhere on the card, rather than a misleading "0%".
 */
export function formatAttendanceLabel(
  card: { daysPresent?: number | null; daysAbsent?: number | null } | null | undefined
): string {
  const present = card?.daysPresent ?? 0;
  const absent = card?.daysAbsent ?? 0;
  const total = present + absent;
  if (total <= 0) return "-";

  const percent = Math.round((present / total) * 100);
  return `${present} of ${total} days (${percent}%)`;
}
