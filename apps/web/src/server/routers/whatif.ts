import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { callOpenRouter } from './ai'

export const whatifRouter = router({
  simulate: protectedProcedure
    .input(z.object({
      changes: z.array(z.object({
        categoryId: z.string().cuid().optional(),
        categoryName: z.string().optional(),
        currentAmount: z.number(),
        newAmount: z.number(),
      })),
      months: z.number().int().min(1).max(24).default(6),
    }))
    .query(async ({ ctx, input }) => {
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      if (!wallet) return null

      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: wallet.id },
        select: { id: true, balance: true },
      })
      const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0)

      // Get current monthly income
      const now = new Date()
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      const accountIds = accounts.map(a => a.id)

      const incomeAgg = await ctx.prisma.transaction.aggregate({
        where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: threeMonthsAgo } },
        _sum: { amount: true },
      })
      const monthlyIncome = Number(incomeAgg._sum.amount ?? 0) / 3

      // Calculate savings difference
      const currentMonthlyExpense = input.changes.reduce((s, c) => s + c.currentAmount, 0)
      const newMonthlyExpense = input.changes.reduce((s, c) => s + c.newAmount, 0)
      const monthlySavingsDiff = currentMonthlyExpense - newMonthlyExpense

      // Project forward
      const currentProjection: Array<{ month: number; balance: number }> = []
      const newProjection: Array<{ month: number; balance: number }> = []

      const currentMonthlySavings = monthlyIncome - currentMonthlyExpense
      const newMonthlySavings = monthlyIncome - newMonthlyExpense

      for (let m = 0; m <= input.months; m++) {
        currentProjection.push({
          month: m,
          balance: Math.round(totalBalance + currentMonthlySavings * m),
        })
        newProjection.push({
          month: m,
          balance: Math.round(totalBalance + newMonthlySavings * m),
        })
      }

      return {
        monthlyIncome: Math.round(monthlyIncome),
        currentMonthlyExpense: Math.round(currentMonthlyExpense),
        newMonthlyExpense: Math.round(newMonthlyExpense),
        monthlySavingsDiff: Math.round(monthlySavingsDiff),
        totalSavingsOverPeriod: Math.round(monthlySavingsDiff * input.months),
        currentProjection,
        newProjection,
      }
    }),

  suggestScenarios: protectedProcedure.mutation(async ({ ctx }) => {
    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
    if (!wallet) return []

    const accounts = await ctx.prisma.account.findMany({
      where: { walletId: wallet.id },
      select: { id: true },
    })
    const accountIds = accounts.map(a => a.id)

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const spending = await ctx.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        accountId: { in: accountIds },
        type: 'EXPENSE',
        date: { gte: threeMonthsAgo },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    })

    const catIds = spending.map(s => s.categoryId).filter(Boolean) as string[]
    const categories = await ctx.prisma.category.findMany({
      where: { id: { in: catIds } },
      select: { id: true, name: true },
    })
    const catMap = new Map(categories.map(c => [c.id, c.name]))

    const spendingSummary = spending
      .map(s => ({
        categoryId: s.categoryId!,
        categoryName: catMap.get(s.categoryId!) ?? 'Другое',
        monthlyAvg: Math.round(Number(s._sum.amount ?? 0) / 3),
      }))
      .filter(s => s.monthlyAvg > 500)
      .sort((a, b) => b.monthlyAvg - a.monthlyAvg)

    // Generate AI scenarios
    const userRecord = await ctx.prisma.user.findUnique({ where: { id: ctx.user.id }, select: { aiModel: true } })
    const model = userRecord?.aiModel ?? 'anthropic/claude-haiku-4-5-20251001'

    const prompt = `Проанализируй месячные расходы пользователя по категориям и предложи 3 сценария экономии.

Расходы (руб/мес):
${spendingSummary.map(s => `${s.categoryName}: ${s.monthlyAvg}`).join('\n')}

Ответь ТОЛЬКО JSON массивом:
[{"name":"название сценария","changes":[{"categoryName":"категория","reduction":число в процентах}],"estimatedSaving":число руб/мес}]`

    try {
      const raw = await callOpenRouter({ model, prompt, maxTokens: 400 })
      if (!raw) return spendingSummary.slice(0, 3).map(s => ({
        name: `Сократить ${s.categoryName} на 20%`,
        changes: [{ categoryName: s.categoryName, categoryId: s.categoryId, currentAmount: s.monthlyAvg, newAmount: Math.round(s.monthlyAvg * 0.8) }],
        estimatedSaving: Math.round(s.monthlyAvg * 0.2),
      }))

      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) return []
      return JSON.parse(match[0])
    } catch {
      return []
    }
  }),
})
