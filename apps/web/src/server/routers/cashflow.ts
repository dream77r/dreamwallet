import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { addDays, format } from 'date-fns'
import { getOccurrences } from '@/lib/cashflow-utils'

export interface ForecastEvent {
  id: string
  name: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
}

export interface ForecastDay {
  date: string
  income: number
  expense: number
  balance_delta: number
  running_balance: number
  events: ForecastEvent[]
}

export interface ForecastSummary {
  total_income: number
  total_expense: number
  net: number
  min_balance: number
  min_balance_date: string
}

export interface ForecastResult {
  current_balance: number
  forecast: ForecastDay[]
  summary: ForecastSummary
}

export const cashflowRouter = router({
  forecast: protectedProcedure
    .input(z.object({ days: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30) }))
    .query(async ({ ctx, input }): Promise<ForecastResult> => {
      const userId = ctx.user!.id

      const accounts = await ctx.prisma.account.findMany({
        where: { wallet: { userId }, isArchived: false },
        select: { balance: true },
      })

      const currentBalance = accounts.reduce((sum: number, acc: { balance: unknown }) => sum + Number(acc.balance), 0)

      const rules = await ctx.prisma.recurringRule.findMany({
        where: {
          isActive: true,
          transactions: { some: { account: { wallet: { userId } } } },
        },
      })

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startDate = addDays(today, 1)
      const endDate = addDays(today, input.days)

      const dayMap = new Map<string, { income: number; expense: number; events: ForecastEvent[] }>()
      for (let i = 1; i <= input.days; i++) {
        dayMap.set(format(addDays(today, i), 'yyyy-MM-dd'), { income: 0, expense: 0, events: [] })
      }

      for (const rule of rules) {
        for (const date of getOccurrences(rule.schedule, startDate, endDate, rule.nextRunAt)) {
          const key = format(date, 'yyyy-MM-dd')
          const day = dayMap.get(key)
          if (!day) continue
          const amount = Number(rule.amount)
          if (rule.type === 'INCOME') day.income += amount
          else day.expense += amount
          day.events.push({ id: rule.id, name: rule.name, amount, type: rule.type as 'INCOME' | 'EXPENSE' })
        }
      }

      const forecast: ForecastDay[] = []
      let running = currentBalance
      let minBalance = currentBalance
      let minBalanceDate = format(today, 'yyyy-MM-dd')
      let totalIncome = 0
      let totalExpense = 0

      for (const [date, { income, expense, events }] of Array.from(dayMap.entries()).sort()) {
        const delta = income - expense
        running += delta
        totalIncome += income
        totalExpense += expense
        if (running < minBalance) { minBalance = running; minBalanceDate = date }
        forecast.push({
          date,
          income,
          expense,
          balance_delta: Math.round(delta * 100) / 100,
          running_balance: Math.round(running * 100) / 100,
          events,
        })
      }

      return {
        current_balance: Math.round(currentBalance * 100) / 100,
        forecast,
        summary: {
          total_income:    Math.round(totalIncome * 100) / 100,
          total_expense:   Math.round(totalExpense * 100) / 100,
          net:             Math.round((totalIncome - totalExpense) * 100) / 100,
          min_balance:     Math.round(minBalance * 100) / 100,
          min_balance_date: minBalanceDate,
        },
      }
    }),
})
