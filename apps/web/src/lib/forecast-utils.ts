import { addDays, addWeeks, addMonths, addYears, startOfDay } from 'date-fns'

// ─── Schedule map ─────────────────────────────────────────────────────────────

export const SCHEDULE_MAP: Record<string, string> = {
  '0 9 * * *':    'daily',
  '0 9 * * 1':    'weekly',
  '0 9 1 * *':    'monthly',
  '0 9 1 */3 *':  'quarterly',
  '0 9 1 1 *':    'yearly',
}

/**
 * Advances a date by one period according to cron schedule string.
 * Uses date-fns addMonths which automatically clamps to last day of month.
 */
export function advanceBySchedule(date: Date, schedule: string): Date {
  const freq = SCHEDULE_MAP[schedule] ?? 'monthly'
  switch (freq) {
    case 'daily':     return addDays(date, 1)
    case 'weekly':    return addWeeks(date, 1)
    case 'quarterly': return addMonths(date, 3)
    case 'yearly':    return addYears(date, 1)
    case 'monthly':
    default:          return addMonths(date, 1)
  }
}

/**
 * Expands a recurring rule into individual Date occurrences within [from, to].
 * Starts from nextRunAt, fast-forwards to first date >= from.
 */
export function expandRecurring(
  nextRunAt: Date,
  schedule: string,
  from: Date,
  to: Date,
): Date[] {
  const occurrences: Date[] = []
  let cursor = startOfDay(nextRunAt)
  const fromDay = startOfDay(from)
  const toDay   = startOfDay(to)

  // Fast-forward to on/after fromDay
  while (cursor < fromDay) {
    cursor = startOfDay(advanceBySchedule(cursor, schedule))
  }

  while (cursor <= toDay) {
    occurrences.push(new Date(cursor))
    cursor = startOfDay(advanceBySchedule(cursor, schedule))
  }

  return occurrences
}
