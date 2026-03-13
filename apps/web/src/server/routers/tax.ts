import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { generateSelfEmployedReport, generateIPReport, exportToCSV } from '@/lib/tax-export'

export const taxRouter = router({
  getReport: protectedProcedure
    .input(z.object({
      from: z.string(),
      to: z.string(),
      type: z.enum(['self_employed', 'ip_usn_income', 'ip_usn_income_expense']),
    }))
    .query(async ({ ctx, input }) => {
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      if (!wallet) return null

      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: wallet.id },
        select: { id: true },
      })

      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          accountId: { in: accounts.map(a => a.id) },
          date: { gte: new Date(input.from), lte: new Date(input.to) },
        },
        include: { category: { select: { name: true } } },
        orderBy: { date: 'asc' },
      })

      const mapped = transactions.map(t => ({
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        categoryName: t.category?.name ?? null,
      }))

      const period = { from: input.from, to: input.to }

      if (input.type === 'self_employed') {
        return generateSelfEmployedReport(mapped, period)
      }
      return generateIPReport(
        mapped,
        period,
        input.type === 'ip_usn_income' ? 'usn_income' : 'usn_income_expense',
      )
    }),

  export: protectedProcedure
    .input(z.object({
      from: z.string(),
      to: z.string(),
      type: z.enum(['self_employed', 'ip_usn_income', 'ip_usn_income_expense']),
      format: z.enum(['csv']).default('csv'),
    }))
    .query(async ({ ctx, input }) => {
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      if (!wallet) return { data: '', filename: 'tax-report.csv' }

      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: wallet.id },
        select: { id: true },
      })

      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          accountId: { in: accounts.map(a => a.id) },
          date: { gte: new Date(input.from), lte: new Date(input.to) },
        },
        include: { category: { select: { name: true } } },
        orderBy: { date: 'asc' },
      })

      const mapped = transactions.map(t => ({
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        categoryName: t.category?.name ?? null,
      }))

      const period = { from: input.from, to: input.to }
      const report = input.type === 'self_employed'
        ? generateSelfEmployedReport(mapped, period)
        : generateIPReport(mapped, period, input.type === 'ip_usn_income' ? 'usn_income' : 'usn_income_expense')

      return {
        data: exportToCSV(report),
        filename: `tax-${input.type}-${input.from}-${input.to}.csv`,
      }
    }),
})
