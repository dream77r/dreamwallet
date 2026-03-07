import { describe, it, expect } from 'vitest'
import { expandRecurring, advanceBySchedule } from '@/lib/forecast-utils'

const SCHEDULES = {
  daily:     '0 9 * * *',
  weekly:    '0 9 * * 1',
  monthly:   '0 9 1 * *',
  quarterly: '0 9 1 */3 *',
  yearly:    '0 9 1 1 *',
}

describe('advanceBySchedule', () => {
  it('daily: adds 1 day', () => {
    const d = new Date('2026-03-01')
    expect(advanceBySchedule(d, SCHEDULES.daily)).toEqual(new Date('2026-03-02'))
  })

  it('weekly: adds 7 days', () => {
    const d = new Date('2026-03-01')
    expect(advanceBySchedule(d, SCHEDULES.weekly)).toEqual(new Date('2026-03-08'))
  })

  it('monthly: advances to next month same day', () => {
    const d = new Date('2026-01-31')
    const next = advanceBySchedule(d, SCHEDULES.monthly)
    // addMonths clamps to last valid day of Feb
    expect(next.getMonth()).toBe(1) // February
    expect(next.getDate()).toBeLessThanOrEqual(28)
  })

  it('monthly: Feb 29 edge case (non-leap year)', () => {
    // 2026 is not a leap year
    const d = new Date('2026-01-29')
    const next = advanceBySchedule(d, SCHEDULES.monthly)
    expect(next.getMonth()).toBe(1)
  })

  it('yearly: adds 1 year', () => {
    const d = new Date('2026-03-01')
    expect(advanceBySchedule(d, SCHEDULES.yearly)).toEqual(new Date('2027-03-01'))
  })
})

describe('expandRecurring', () => {
  const from = new Date('2026-03-07')
  const to   = new Date('2026-04-07') // ~30 days

  it('monthly: returns correct occurrences in range', () => {
    const nextRunAt = new Date('2026-03-15')
    const occ = expandRecurring(nextRunAt, SCHEDULES.monthly, from, to)
    expect(occ).toHaveLength(1)
    expect(occ[0].getDate()).toBe(15)
    expect(occ[0].getMonth()).toBe(2) // March
  })

  it('monthly: nextRunAt before range starts → fast-forwards', () => {
    const nextRunAt = new Date('2026-02-01')
    const occ = expandRecurring(nextRunAt, SCHEDULES.monthly, from, to)
    // Next after Feb 1 monthly is Mar 1, then Apr 1
    expect(occ.length).toBeGreaterThanOrEqual(1)
    occ.forEach((d) => {
      expect(d >= from).toBe(true)
      expect(d <= to).toBe(true)
    })
  })

  it('weekly: returns ~4 occurrences in 30-day range', () => {
    const nextRunAt = new Date('2026-03-09') // Monday
    const occ = expandRecurring(nextRunAt, SCHEDULES.weekly, from, to)
    expect(occ.length).toBeGreaterThanOrEqual(4)
  })

  it('daily: returns occurrences for every day', () => {
    const nextRunAt = new Date('2026-03-07')
    const shortTo = new Date('2026-03-14')
    const occ = expandRecurring(nextRunAt, SCHEDULES.daily, from, shortTo)
    expect(occ).toHaveLength(8) // 7 → 14 inclusive
  })

  it('yearly: returns 1 occurrence if falls in range', () => {
    const nextRunAt = new Date('2026-03-20')
    const occ = expandRecurring(nextRunAt, SCHEDULES.yearly, from, to)
    expect(occ).toHaveLength(1)
  })

  it('yearly: returns 0 if not in range', () => {
    const nextRunAt = new Date('2027-01-01')
    const occ = expandRecurring(nextRunAt, SCHEDULES.yearly, from, to)
    expect(occ).toHaveLength(0)
  })

  it('handles end-of-month Feb 29 in non-leap year', () => {
    const nextRunAt = new Date('2026-01-29')
    const rangeFrom = new Date('2026-01-01')
    const rangeTo = new Date('2026-04-01')
    // Should not throw
    expect(() =>
      expandRecurring(nextRunAt, SCHEDULES.monthly, rangeFrom, rangeTo),
    ).not.toThrow()
  })
})
