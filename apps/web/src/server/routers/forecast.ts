import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { addDays, format, startOfDay } from 'date-fns'
import { expandRecurring } from '@/lib/forecast-utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ForecastEvent {
  date: string          // 'YYYY-MM-DD'
  name: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  currency: string
}

export interface ForecastDay {
  date: string
  income: number
  expense: number
  balance: number
  events: ForecastEvent[]
}

export interface ForecastResult {
  periodDays: number
  startBalance: number
  endBalance: number
  totalIncome: number
  totalExpense: number
  daily: ForecastDay[]
}

// ─── In-memory cache (15 min TTL) ────────────────────────────────────────────

interface CacheEntry {
  data: ForecastResult
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 15 * 60 * 1000

function getCached(key: string): ForecastResult | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key: string, data: ForecastResult): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const forecastRouter = router({
  get: protectedProcedure
    .input(z.object({ days: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const cacheKey = `${userId}:${input.days}`

      const cached = getCached(cacheKey)
      if (cached) return cached

      // ── Fetch data ──────────────────────────────────────────────────────────
      const [accounts, recurringRules] = await Promise.all([
        ctx.prisma.account.findMany({
          where: { wallet: { userId }, isArchived: false },
          select: { balance: true, currency: true },
        }),
        ctx.prisma.recurringRule.findMany({
          where: {
            isActive: true,
            transactions: {
              some: { account: { wallet: { userId } } },
            },
          },
          include: {
            transactions: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: { account: { select: { currency: true } } },
            },
          },
        }),
      ])

      // ── Compute start balance ───────────────────────────────────────────────
      // For simplicity: treat all balances as same currency (main currency)
      // TODO: add currency conversion when exchange rate service is ready
      const startBalance = accounts.reduce((sum: number, a: { balance: unknown }) => sum + Number(a.balance), 0)

      // ── Expand recurring rules into events ─────────────────────────────────
      const today = startOfDay(new Date())
      const endDate = addDays(today, input.days)

      const allEvents: ForecastEvent[] = []

      for (const rule of recurringRules) {
        if (!rule.nextRunAt) continue
        const currency =
          rule.transactions[0]?.account?.currency ?? 'RUB'
        const occurrences = expandRecurring(rule.nextRunAt, rule.schedule, today, endDate)
        for (const date of occurrences) {
          allEvents.push({
            date: format(date, 'yyyy-MM-dd'),
            name: rule.name,
            amount: Number(rule.amount),
            type: rule.type as 'INCOME' | 'EXPENSE',
            currency,
          })
        }
      }

      // ── Build daily map ────────────────────────────────────────────────────
      const dayMap = new Map<string, ForecastDay>()
      for (let i = 0; i <= input.days; i++) {
        const d = format(addDays(today, i), 'yyyy-MM-dd')
        dayMap.set(d, { date: d, income: 0, expense: 0, balance: 0, events: [] })
      }

      for (const ev of allEvents) {
        const day = dayMap.get(ev.date)
        if (!day) continue
        if (ev.type === 'INCOME') day.income += ev.amount
        else day.expense += ev.amount
        day.events.push(ev)
      }

      // ── Running balance ────────────────────────────────────────────────────
      let runningBalance = startBalance
      let totalIncome = 0
      let totalExpense = 0

      const daily = Array.from(dayMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      )

      for (const day of daily) {
        runningBalance += day.income - day.expense
        totalIncome += day.income
        totalExpense += day.expense
        day.balance = Math.round(runningBalance)
      }

      const result: ForecastResult = {
        periodDays: input.days,
        startBalance: Math.round(startBalance),
        endBalance: Math.round(runningBalance),
        totalIncome: Math.round(totalIncome),
        totalExpense: Math.round(totalExpense),
        daily,
      }

      setCached(cacheKey, result)
      return result
    }),
})
