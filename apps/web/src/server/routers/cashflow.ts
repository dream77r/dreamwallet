import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

// Разворачиваем cron-расписание в конкретные даты
function getNextDates(nextRunAt: Date, schedule: string, days: number): Date[] {
  const dates: Date[] = []
  const now = new Date()
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  
  // Парсим cron: "0 8 * * 1" = еженедельно, "0 8 1 * *" = ежемесячно, "0 8 * * *" = ежедневно
  const parts = schedule.trim().split(' ')
  if (parts.length < 5) return []
  
  const [, , dayOfMonth, , dayOfWeek] = parts
  
  let interval: number
  if (dayOfMonth !== '*' && dayOfMonth !== undefined) {
    interval = 30 * 24 * 60 * 60 * 1000 // monthly
  } else if (dayOfWeek !== '*' && dayOfWeek !== undefined) {
    interval = 7 * 24 * 60 * 60 * 1000 // weekly
  } else {
    interval = 24 * 60 * 60 * 1000 // daily
  }

  let current = new Date(nextRunAt)
  while (current <= end) {
    if (current >= now) dates.push(new Date(current))
    current = new Date(current.getTime() + interval)
  }
  return dates.slice(0, 60) // не больше 60 дат на одно правило
}

export const cashflowRouter = router({
  forecast: protectedProcedure
    .input(z.object({ days: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const { days } = input
      const now = new Date()
      const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

      // Текущий баланс
      const wallet = await ctx.prisma.wallet.findFirst({
        where: { userId },
        include: { accounts: { select: { id: true, balance: true } } },
      })
      if (!wallet) return null

      const currentBalance = wallet.accounts.reduce((s, a) => s + Number(a.balance), 0)

      // Активные recurring rules
      const rules = await ctx.prisma.recurringRule.findMany({
        where: { isActive: true },
      })

      // Строим per-day карту изменений баланса
      const dayMap = new Map<string, { income: number; expense: number }>()
      
      for (const rule of rules) {
        const dates = getNextDates(rule.nextRunAt, rule.schedule, days)
        for (const date of dates) {
          const key = date.toISOString().split('T')[0]!
          const existing = dayMap.get(key) ?? { income: 0, expense: 0 }
          const amount = Number(rule.amount)
          if (rule.type === 'INCOME') existing.income += amount
          else if (rule.type === 'EXPENSE') existing.expense += amount
          dayMap.set(key, existing)
        }
      }

      // Генерируем дни
      const dailyData: Array<{
        date: string
        income: number
        expense: number
        net: number
        balance: number
      }> = []

      let runningBalance = currentBalance
      for (let i = 0; i < days; i++) {
        const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
        const key = d.toISOString().split('T')[0]!
        const day = dayMap.get(key) ?? { income: 0, expense: 0 }
        const net = day.income - day.expense
        runningBalance += net
        dailyData.push({
          date: key,
          income: Math.round(day.income),
          expense: Math.round(day.expense),
          net: Math.round(net),
          balance: Math.round(runningBalance),
        })
      }

      const minBalance = Math.min(...dailyData.map((d) => d.balance))
      const minBalanceDate = dailyData.find((d) => d.balance === minBalance)?.date ?? null
      const totalIncome = dailyData.reduce((s, d) => s + d.income, 0)
      const totalExpense = dailyData.reduce((s, d) => s + d.expense, 0)

      return {
        currentBalance: Math.round(currentBalance),
        dailyData,
        summary: {
          totalIncome: Math.round(totalIncome),
          totalExpense: Math.round(totalExpense),
          netChange: Math.round(totalIncome - totalExpense),
          minBalance: Math.round(minBalance),
          minBalanceDate,
          endBalance: Math.round(currentBalance + totalIncome - totalExpense),
          deficit: minBalance < 0,
        },
        days,
      }
    }),
})
