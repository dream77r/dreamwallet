import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

const REPORT_TYPES = ['pnl', 'cashflow', 'category_breakdown', 'monthly_summary'] as const

export const reportsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.report.findMany({
      where: { userId: ctx.user.id } as any,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      type: z.enum(REPORT_TYPES),
      filters: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.report.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          type: input.type,
          filters: (input.filters ?? {}) as any,
        } as any,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.report.deleteMany({
        where: { id: input.id, userId: ctx.user.id } as any,
      })
      return { success: true }
    }),

  // Data for report generation (used by API route)
  getData: protectedProcedure
    .input(z.object({
      type: z.enum(REPORT_TYPES),
      from: z.string(), // ISO date
      to: z.string(),   // ISO date
      accountIds: z.array(z.string()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.from)
      const to = new Date(input.to)

      // Get user accounts
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      if (!wallet) return null

      const accounts = await ctx.prisma.account.findMany({
        where: {
          walletId: wallet.id,
          ...(input.accountIds?.length ? { id: { in: input.accountIds } } : {}),
        },
        select: { id: true, name: true, currency: true, balance: true },
      })
      const accountIds = accounts.map(a => a.id)

      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          accountId: { in: accountIds },
          date: { gte: from, lte: to },
        },
        include: { category: { select: { name: true, icon: true } } },
        orderBy: { date: 'asc' },
      })

      const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
      const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

      // Category breakdown
      const byCategory: Record<string, { name: string; icon: string; amount: number; count: number }> = {}
      for (const t of transactions.filter(t => t.type === 'EXPENSE')) {
        const key = t.category?.name ?? 'Без категории'
        if (!byCategory[key]) byCategory[key] = { name: key, icon: t.category?.icon ?? '📦', amount: 0, count: 0 }
        byCategory[key].amount += Number(t.amount)
        byCategory[key].count++
      }

      // Monthly breakdown
      const byMonth: Record<string, { income: number; expense: number }> = {}
      for (const t of transactions) {
        const key = t.date.toISOString().slice(0, 7)
        if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 }
        if (t.type === 'INCOME') byMonth[key].income += Number(t.amount)
        else byMonth[key].expense += Number(t.amount)
      }

      return {
        period: { from: input.from, to: input.to },
        accounts,
        summary: { income, expense, net: income - expense, txCount: transactions.length },
        byCategory: Object.values(byCategory).sort((a, b) => b.amount - a.amount).slice(0, 15),
        byMonth: Object.entries(byMonth).map(([month, v]) => ({ month, ...v })),
        transactions: transactions.slice(0, 100).map(t => ({
          date: t.date.toISOString().slice(0, 10),
          description: t.description ?? '',
          category: t.category?.name ?? '',
          type: t.type,
          amount: Number(t.amount),
          currency: t.currency,
        })),
      }
    }),
})
