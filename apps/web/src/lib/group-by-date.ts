import { formatDateLabel } from './format'

export interface DateGroup<T> {
  label: string
  date: Date
  items: T[]
}

export function groupTransactionsByDate<T extends { date: Date | string }>(
  items: T[],
): DateGroup<T>[] {
  const map = new Map<string, { date: Date; items: T[] }>()

  for (const item of items) {
    const d = typeof item.date === 'string' ? new Date(item.date) : item.date
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    const existing = map.get(key)
    if (existing) {
      existing.items.push(item)
    } else {
      map.set(key, { date: d, items: [item] })
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map(({ date, items }) => ({
      label: formatDateLabel(date),
      date,
      items,
    }))
}
