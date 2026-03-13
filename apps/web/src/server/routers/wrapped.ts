import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

const RUSSIAN_MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export const wrappedRouter = router({
  getData: protectedProcedure
    .input(z.object({
      period: z.enum(['monthly', 'yearly']),
      month: z.number().min(1).max(12).optional(),
      year: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const wallet = await ctx.prisma.wallet.findFirst({
        where: { userId: ctx.user.id },
      })
      if (!wallet) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Кошелёк не найден' })
      }

      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: wallet.id, isArchived: false },
        select: { id: true },
      })
      const accountIds = accounts.map(a => a.id)

      // Compute date range
      let dateFrom: Date
      let dateTo: Date
      let label: string

      if (input.period === 'monthly') {
        const month = input.month ?? 1
        dateFrom = new Date(input.year, month - 1, 1)
        dateTo = new Date(input.year, month, 0, 23, 59, 59, 999)
        label = `${RUSSIAN_MONTHS[month - 1]} ${input.year}`
      } else {
        dateFrom = new Date(input.year, 0, 1)
        dateTo = new Date(input.year, 11, 31, 23, 59, 59, 999)
        label = String(input.year)
      }

      const dateFilter = { gte: dateFrom, lte: dateTo }

      // Run all queries in a single Promise.all batch
      const [
        totalIncomeAgg,
        totalExpenseAgg,
        topSpendingDayRaw,
        topCategoryRaw,
        favoriteMerchantRaw,
        budgets,
        userStreak,
        transactionCount,
      ] = await Promise.all([
        // a. Total income
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'INCOME', date: dateFilter },
          _sum: { amount: true },
        }),
        // b. Total expense
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: dateFilter },
          _sum: { amount: true },
        }),
        // c. Top spending day
        ctx.prisma.transaction.groupBy({
          by: ['date'],
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: dateFilter },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 1,
        }),
        // d. Top category
        ctx.prisma.transaction.groupBy({
          by: ['categoryId'],
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: dateFilter },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 1,
        }),
        // e. Favorite merchant
        ctx.prisma.transaction.groupBy({
          by: ['counterparty'],
          where: {
            accountId: { in: accountIds },
            type: 'EXPENSE',
            date: dateFilter,
            counterparty: { not: '' },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 1,
        }),
        // f. Budget discipline — fetch active budgets for wallet
        ctx.prisma.budget.findMany({
          where: { walletId: wallet.id, isActive: true },
          select: { id: true, categoryId: true, amount: true },
        }),
        // g. UserStreak
        ctx.prisma.userStreak.findUnique({
          where: { userId: ctx.user.id },
          select: { longestStreak: true, currentStreak: true },
        }),
        // h. Transaction count
        ctx.prisma.transaction.count({
          where: { accountId: { in: accountIds }, date: dateFilter },
        }),
      ])

      const totalIncome = Number(totalIncomeAgg._sum.amount ?? 0)
      const totalExpense = Number(totalExpenseAgg._sum.amount ?? 0)

      // Top spending day
      const topSpendingDay = topSpendingDayRaw.length > 0
        ? {
            date: new Date(topSpendingDayRaw[0].date).toISOString().split('T')[0],
            amount: Number(topSpendingDayRaw[0]._sum.amount ?? 0),
          }
        : null

      // Top category — fetch category details
      let topCategory: { name: string; icon: string; amount: number } | null = null
      if (topCategoryRaw.length > 0 && topCategoryRaw[0].categoryId) {
        const cat = await ctx.prisma.category.findUnique({
          where: { id: topCategoryRaw[0].categoryId },
          select: { name: true, icon: true },
        })
        if (cat) {
          topCategory = {
            name: cat.name,
            icon: cat.icon ?? '',
            amount: Number(topCategoryRaw[0]._sum.amount ?? 0),
          }
        }
      }

      // Favorite merchant
      const favoriteMerchant = favoriteMerchantRaw.length > 0 && favoriteMerchantRaw[0].counterparty
        ? {
            name: favoriteMerchantRaw[0].counterparty,
            visits: favoriteMerchantRaw[0]._count.id,
          }
        : null

      // Budget discipline — compute spent per budget in period
      let respected = 0
      let savedAmount = 0
      const total = budgets.length

      if (budgets.length > 0) {
        const budgetCategoryIds = budgets.map(b => b.categoryId).filter(Boolean) as string[]
        const budgetSpending = budgetCategoryIds.length > 0
          ? await ctx.prisma.transaction.groupBy({
              by: ['categoryId'],
              where: {
                accountId: { in: accountIds },
                type: 'EXPENSE',
                date: dateFilter,
                categoryId: { in: budgetCategoryIds },
              },
              _sum: { amount: true },
            })
          : []

        const spendMap = new Map(budgetSpending.map(s => [s.categoryId, Number(s._sum.amount ?? 0)]))

        for (const b of budgets) {
          const spent = spendMap.get(b.categoryId ?? '') ?? 0
          const budgetAmount = Number(b.amount)
          if (spent <= budgetAmount) {
            respected++
            savedAmount += budgetAmount - spent
          }
        }
      }

      const budgetDiscipline = { respected, total, savedAmount: Math.round(savedAmount) }

      // Savings rate
      const savingsRate = totalIncome > 0
        ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
        : 0

      // Financial score (same formula as dashboardData in wallet.ts)
      const savingsRateDecimal = totalIncome > 0 ? Math.max(0, (totalIncome - totalExpense) / totalIncome) : 0
      const savingsScore = Math.min(40, Math.round((savingsRateDecimal / 0.2) * 40))
      const budgetScore = total > 0 ? Math.round((respected / total) * 30) : 30

      // Goals — fetch for goal score
      const goals = await ctx.prisma.goal.findMany({
        where: { userId: ctx.user.id, isCompleted: false },
        select: { currentAmount: true, targetAmount: true },
      })
      const goalScore = goals.length > 0
        ? Math.round(
            goals.reduce((s, g) => s + Math.min(1, Number(g.currentAmount) / Math.max(1, Number(g.targetAmount))), 0)
            / goals.length * 15
          )
        : 15

      // Consistency score simplified (no previous period comparison in wrapped)
      const consistencyScore = 15

      const financialScore = savingsScore + budgetScore + goalScore + consistencyScore

      return {
        period: {
          from: dateFrom.toISOString().split('T')[0],
          to: dateTo.toISOString().split('T')[0],
          label,
        },
        totalIncome,
        totalExpense,
        transactionCount,
        topSpendingDay,
        topCategory,
        favoriteMerchant,
        budgetDiscipline,
        savingsRate,
        longestStreak: userStreak?.longestStreak ?? 0,
        financialScore,
      }
    }),
})
