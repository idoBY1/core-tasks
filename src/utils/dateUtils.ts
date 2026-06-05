// ─────────────────────────────────────────────
// Smart Todo — Date Utilities
// ─────────────────────────────────────────────

import {
  isToday,
  isTomorrow,
  isThisWeek,
  isBefore,
  startOfDay,
  addDays,
  format,
  formatDistanceToNow,
  parseISO,
  isValid,
} from "date-fns";

export { isToday, isTomorrow, isThisWeek, format, parseISO, isValid };

/** Returns true if the due date has passed (end of day). */
export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const d = parseISO(dueDate);
  return isValid(d) && isBefore(d, startOfDay(new Date()));
}

/** Returns true if due date is within the next N days (inclusive of today). */
export function isDueWithinDays(dueDate: string | null, days: number): boolean {
  if (!dueDate) return false;
  const d = parseISO(dueDate);
  return isValid(d) && !isBefore(d, startOfDay(new Date())) && isBefore(d, startOfDay(addDays(new Date(), days)));
}

/** Human-readable relative time: "in 3 hours", "2 days ago". */
export function relativeTime(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : null;
}

/** Format a date string for display. */
export function displayDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  if (!isValid(d)) return null;
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d, yyyy");
}

/** Format a time string for display. */
export function displayTime(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  return isValid(d) ? format(d, "h:mm a") : null;
}
