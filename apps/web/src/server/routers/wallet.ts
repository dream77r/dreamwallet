import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const walletRouter = router({
  // Get personal wallet with accounts
  get: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.prisma.wallet.findUnique({
      where: { userId: ctx.user.id },
      include: {
        accounts: {
          where: { isArchived: false },
          orderBy: { sortOrder: 'asc' },
        },
        budgets: {
          where: { isActive: true },
          include: { category: true },
        },
      },
    })

    if (!wallet) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Кошелёк не найден' })
    }

    return wallet
  }),

  // Get stats for wallet dashboard
  getStats: protectedProcedure
    .input(z.object({
      walletId: z.string().cuid(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

      const from = input.dateFrom || monthStart
      const to = input.dateTo || monthEnd

      // Get all accounts for this wallet
      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: input.walletId, isArchived: false },
        select: { id: true, balance: true },
      })

      const accountIds = accounts.map(a => a.id)
      const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

      // Current month income/expense
      const [currentIncome, currentExpense] = await Promise.all([
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
      ])

      // Previous month for comparison
      const [prevIncome, prevExpense] = await Promise.all([
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: prevMonthStart, lte: prevMonthEnd } },
          _sum: { amount: true },
        }),
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: prevMonthStart, lte: prevMonthEnd } },
          _sum: { amount: true },
        }),
      ])

      const monthIncome = Number(currentIncome._sum.amount || 0)
      const monthExpense = Number(currentExpense._sum.amount || 0)
      const monthNet = monthIncome - monthExpense
      const previousMonthNet = Number(prevIncome._sum.amount || 0) - Number(prevExpense._sum.amount || 0)

      return {
        totalBalance,
        monthIncome,
        monthExpense,
        monthNet,
        previousMonthNet,
        changePercent: previousMonthNet === 0
          ? monthNet > 0 ? 100 : 0
          : Math.round(((monthNet - previousMonthNet) / Math.abs(previousMonthNet)) * 100),
      }
    }),

  // Get category breakdown
  getCategoryBreakdown: protectedProcedure
    .input(z.object({
      walletId: z.string().cuid(),
      type: z.enum(['INCOME', 'EXPENSE']),
      dateFrom: z.coerce.date(),
      dateTo: z.coerce.date(),
    }))
    .query(async ({ ctx, input }) => {
      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: input.walletId, isArchived: false },
        select: { id: true },
      })
      const accountIds = accounts.map(a => a.id)

      const transactions = await ctx.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          accountId: { in: accountIds },
          type: input.type,
          date: { gte: input.dateFrom, lte: input.dateTo },
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      })

      const totalAmount = transactions.reduce((sum, t) => sum + Number(t._sum.amount || 0), 0)

      // Fetch category details
      const categoryIds = transactions.map(t => t.categoryId).filter(Boolean) as string[]
      const categories = await ctx.prisma.category.findMany({
        where: { id: { in: categoryIds } },
      })
      const categoryMap = new Map(categories.map(c => [c.id, c]))

      return transactions.map(t => {
        const cat = t.categoryId ? categoryMap.get(t.categoryId) : null
        const amount = Number(t._sum.amount || 0)
        return {
          categoryId: t.categoryId || 'uncategorized',
          categoryName: cat?.name || 'Без категории',
          icon: cat?.icon || null,
          color: cat?.color || null,
          amount,
          percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
          transactionCount: t._count,
        }
      })
    }),

  // Cash flow for last 12 months
  getCashFlow: protectedProcedure
    .input(z.object({
      walletId: z.string().cuid(),
      months: z.number().int().min(1).max(24).default(12),
    }))
    .query(async ({ ctx, input }) => {
      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: input.walletId, isArchived: false },
        select: { id: true },
      })
      const accountIds = accounts.map(a => a.id)

      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth() - input.months + 1, 1)

      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          accountId: { in: accountIds },
          type: { in: ['INCOME', 'EXPENSE'] },
          date: { gte: startDate },
        },
        select: { date: true, type: true, amount: true },
      })

      // Group by month
      const monthMap = new Map<string, { income: number; expense: number }>()
      for (let i = 0; i < input.months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - input.months + 1 + i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthMap.set(key, { income: 0, expense: 0 })
      }

      for (const tx of transactions) {
        const d = new Date(tx.date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const entry = monthMap.get(key)
        if (entry) {
          if (tx.type === 'INCOME') entry.income += Number(tx.amount)
          else entry.expense += Number(tx.amount)
        }
      }

      return Array.from(monthMap.entries()).map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      }))
    }),
})
