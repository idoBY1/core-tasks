// ─────────────────────────────────────────────
// Smart Todo — Recurrence Types & Helpers
// Re-exports from item.ts for convenient import.
// ─────────────────────────────────────────────

import type {
  RecurrenceRule,
  RecurrenceFrequency,
  DayOfWeek,
} from "./item";

import { addDays, addWeeks, addMonths, addYears, parseISO, isBefore } from "date-fns";

export type { RecurrenceRule, RecurrenceFrequency, DayOfWeek };

/**
 * Compute the next due date from a recurrence rule.
 * Returns null if the recurrence has ended or is invalid.
 */
export function nextDueDate(
  rule: RecurrenceRule,
  currentDate: string | null
): string | null {
  if (!currentDate) return null;

  const base = parseISO(currentDate);
  if (isNaN(base.getTime())) return null;

  // Check end date
  if (rule.endDate) {
    const end = parseISO(rule.endDate);
    if (!isBefore(base, end)) return null;
  }

  const interval = rule.interval || 1;

  let next: Date;
  switch (rule.frequency) {
    case "daily":
      next = addDays(base, interval);
      break;
    case "weekly":
      next = addWeeks(base, interval);
      break;
    case "monthly":
      next = addMonths(base, interval);
      break;
    case "yearly":
      next = addYears(base, interval);
      break;
    case "custom":
      // For custom, default to daily interval
      next = addDays(base, interval);
      break;
    default:
      return null;
  }

  // Skip exception dates
  if (rule.exceptions?.length) {
    const nextStr = next.toISOString().slice(0, 10);
    if (rule.exceptions.some((ex) => ex.slice(0, 10) === nextStr)) {
      return nextDueDate(rule, next.toISOString());
    }
  }

  return next.toISOString();
}
