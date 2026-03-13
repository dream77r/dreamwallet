import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const cashbackRouter = router({
  getRules: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
    if (!wallet) return []

    const accounts = await ctx.prisma.account.findMany({
      where: { walletId: wallet.id },
      select: { id: true },
    })

    return ctx.prisma.cashbackRule.findMany({
      where: { accountId: { in: accounts.map(a => a.id) }, isActive: true },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, icon: true } },
      },
    })
  }),

  setRule: protectedProcedure
    .input(z.object({
      id: z.string().cuid().optional(),
      accountId: z.string().cuid(),
      categoryId: z.string().cuid().nullable(),
      rate: z.number().min(0).max(100),
      maxMonthly: z.number().min(0).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        return ctx.prisma.cashbackRule.update({
          where: { id: input.id },
          data: {
            categoryId: input.categoryId,
            rate: input.rate,
            maxMonthly: input.maxMonthly,
          },
        })
      }
      return ctx.prisma.cashbackRule.create({
        data: {
          accountId: input.accountId,
          categoryId: input.categoryId,
          rate: input.rate,
          maxMonthly: input.maxMonthly,
        },
      })
    }),

  deleteRule: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.cashbackRule.delete({ where: { id: input.id } })
      return { success: true }
    }),

  getSummary: protectedProcedure
    .input(z.object({
      month: z.number().int().min(1).max(12),
      year: z.number().int(),
    }))
    .query(async ({ ctx, input }) => {
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      if (!wallet) return { total: 0, received: 0, pending: 0, byAccount: [] }

      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: wallet.id },
        select: { id: true, name: true },
      })
      const accountIds = accounts.map(a => a.id)

      const start = new Date(input.year, input.month - 1, 1)
      const end = new Date(input.year, input.month, 0, 23, 59, 59)

      const entries = await ctx.prisma.cashbackEntry.findMany({
        where: { accountId: { in: accountIds }, createdAt: { gte: start, lte: end } },
      })

      const total = entries.reduce((s, e) => s + Number(e.amount), 0)
      const received = entries.filter(e => e.isReceived).reduce((s, e) => s + Number(e.amount), 0)

      const byAccount = accounts.map(acc => {
        const accEntries = entries.filter(e => e.accountId === acc.id)
        return {
          accountId: acc.id,
          accountName: acc.name,
          total: accEntries.reduce((s, e) => s + Number(e.amount), 0),
        }
      }).filter(a => a.total > 0)

      return { total, received, pending: total - received, byAccount }
    }),

  suggestCard: protectedProcedure
    .input(z.object({ categoryId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      if (!wallet) return null

      const accounts = await ctx.prisma.account.findMany({
        where: { walletId: wallet.id },
        select: { id: true },
      })

      const rules = await ctx.prisma.cashbackRule.findMany({
        where: {
          accountId: { in: accounts.map(a => a.id) },
          categoryId: input.categoryId,
          isActive: true,
        },
        include: { account: { select: { name: true } } },
        orderBy: { rate: 'desc' },
        take: 1,
      })

      if (!rules.length) return null
      return { accountName: rules[0].account.name, rate: Number(rules[0].rate) }
    }),

  markReceived: protectedProcedure
    .input(z.object({ ids: z.array(z.string().cuid()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.cashbackEntry.updateMany({
        where: { id: { in: input.ids } },
        data: { isReceived: true },
      })
      return { success: true }
    }),
})
