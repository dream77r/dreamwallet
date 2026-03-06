import { describe, it, expect } from 'vitest'
import { getOccurrences } from '../lib/cashflow-utils'

const DAILY     = '0 9 * * *'
const WEEKLY    = '0 9 * * 1'
const MONTHLY   = '0 9 1 * *'
const QUARTERLY = '0 9 1 */3 *'
const YEARLY    = '0 9 1 1 *'

describe('getOccurrences', () => {
  it('daily — 4 вхождения за 4 дня', () => {
    const from = new Date('2026-03-07T00:00:00Z')
    const to   = new Date('2026-03-10T23:59:59Z')
    expect(getOccurrences(DAILY, from, to)).toHaveLength(4)
  })

  it('weekly — корректные понедельники (4 шт.)', () => {
    const from = new Date('2026-03-09T00:00:00Z') // пн
    const to   = new Date('2026-03-30T23:59:59Z')
    const result = getOccurrences(WEEKLY, from, to)
    expect(result.length).toBe(4) // 9, 16, 23, 30
    result.forEach((d) => expect(d.getDay()).toBe(1)) // все — понедельники (UTC)
  })

  it('monthly — одно вхождение в апреле', () => {
    const from = new Date('2026-04-01T00:00:00Z')
    const to   = new Date('2026-04-30T23:59:59Z')
    const result = getOccurrences(MONTHLY, from, to)
    expect(result).toHaveLength(1)
  })

  it('yearly — 0 вхождений в марте (anchor = Jan 1)', () => {
    const anchor = new Date('2026-01-01T09:00:00Z')
    const from   = new Date('2026-03-07T00:00:00Z')
    const to     = new Date('2026-03-31T23:59:59Z')
    // следующий trigger после Jan 1 + 1 year = Jan 2027 → не попадает в март
    expect(getOccurrences(YEARLY, from, to, anchor)).toHaveLength(0)
  })

  it('yearly — 1 вхождение в следующем январе', () => {
    const anchor = new Date('2026-01-01T09:00:00Z')
    const from   = new Date('2027-01-01T00:00:00Z')
    const to     = new Date('2027-01-31T23:59:59Z')
    expect(getOccurrences(YEARLY, from, to, anchor)).toHaveLength(1)
  })

  it('from > to — пустой массив', () => {
    const from = new Date('2026-04-10T00:00:00Z')
    const to   = new Date('2026-04-01T00:00:00Z')
    expect(getOccurrences(MONTHLY, from, to)).toHaveLength(0)
  })

  it('unknown schedule — fallback monthly', () => {
    const from = new Date('2026-04-01T00:00:00Z')
    const to   = new Date('2026-05-31T23:59:59Z')
    expect(getOccurrences('unknown', from, to).length).toBeGreaterThanOrEqual(1)
  })

  it('quarterly — два вхождения (Jan и Apr)', () => {
    const anchor = new Date('2026-01-01T09:00:00Z')
    const from   = new Date('2026-01-01T00:00:00Z')
    const to     = new Date('2026-06-30T23:59:59Z')
    const result = getOccurrences(QUARTERLY, from, to, anchor)
    expect(result.length).toBe(2)
  })
})
