import { addDays, addWeeks, addMonths, addYears, isAfter } from 'date-fns'

const SCHEDULE_MAP: Record<string, (d: Date) => Date> = {
  '0 9 * * *':   (d) => addDays(d, 1),
  '0 9 * * 1':   (d) => addWeeks(d, 1),
  '0 9 1 * *':   (d) => addMonths(d, 1),
  '0 9 1 */3 *': (d) => addMonths(d, 3),
  '0 9 1 1 *':   (d) => addYears(d, 1),
}

/**
 * Разворачивает recurring schedule в список дат срабатываний
 * в диапазоне [from, to] включительно.
 *
 * @param schedule - cron-выражение из SCHEDULE_MAP
 * @param from     - начало диапазона (inclusive)
 * @param to       - конец диапазона (inclusive)
 * @param anchor   - якорная дата первого срабатывания (обычно nextRunAt правила).
 *                   Если не задана — стартуем с from.
 */
export function getOccurrences(schedule: string, from: Date, to: Date, anchor?: Date): Date[] {
  const adder = SCHEDULE_MAP[schedule] ?? ((d: Date) => addMonths(d, 1))
  const dates: Date[] = []

  if (isAfter(from, to)) return dates

  // Стартуем от anchor если передан, иначе от from
  let cursor = anchor ? new Date(anchor) : new Date(from)
  cursor.setHours(9, 0, 0, 0)

  // Если anchor < from — прокручиваем до первой даты >= from
  while (cursor < from) {
    cursor = adder(cursor)
  }

  while (!isAfter(cursor, to)) {
    dates.push(new Date(cursor))
    cursor = adder(cursor)
  }

  return dates
}
