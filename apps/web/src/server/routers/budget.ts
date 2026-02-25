import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { createBudgetSchema } from '@dreamwallet/shared'

export const budgetRouter = router({
  list: protectedProcedure
    .input(z.object({ walletId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const budgets = await ctx.prisma.budget.findMany({
        where: { walletId: input.walletId, isActive: true },
        include: { category: true },
        orderBy: { category: { name: 'asc' } },
      })

      // Calculate spent amounts for current period
      const now = new Date()
      const results = await Promise.all(
        budgets.map(async (budget) => {
          let periodStart: Date
          if (budget.period === 'MONTHLY') {
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
          } else if (budget.period === 'WEEKLY') {
            const day = now.getDay() || 7
            periodStart = new Date(now)
            periodStart.setDate(now.getDate() - day + 1)
            periodStart.setHours(0, 0, 0, 0)
          } else {
            periodStart = new Date(now.getFullYear(), 0, 1)
          }

          const accounts = await ctx.prisma.account.findMany({
            where: { walletId: input.walletId },
            select: { id: true },
          })

          const spent = await ctx.prisma.transaction.aggregate({
            where: {
              accountId: { in: accounts.map(a => a.id) },
              categoryId: budget.categoryId,
              type: 'EXPENSE',
              date: { gte: periodStart },
            },
            _sum: { amount: true },
          })

          const spentAmount = Number(spent._sum.amount || 0)
          const budgetAmount = Number(budget.amount)

          return {
            ...budget,
            amount: budgetAmount,
            spentAmount,
            percentage: budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0,
          }
        })
      )

      return results
    }),

  create: protectedProcedure
    .input(createBudgetSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.budget.create({ data: input })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().cuid(),
      amount: z.number().positive().optional(),
      alertThreshold: z.number().int().min(1).max(100).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.budget.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.budget.delete({ where: { id: input.id } })
      return { success: true }
    }),
})
