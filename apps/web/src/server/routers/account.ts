import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { createAccountSchema, updateAccountSchema } from '@dreamwallet/shared'

export const accountRouter = router({
  list: protectedProcedure
    .input(z.object({
      walletId: z.string().cuid(),
      includeArchived: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.account.findMany({
        where: {
          walletId: input.walletId,
          ...(input.includeArchived ? {} : { isArchived: false }),
        },
        include: { bankConnection: { select: { provider: true, status: true, lastSyncAt: true } } },
        orderBy: { sortOrder: 'asc' },
      })
    }),

  // List all accounts for the current user (across all wallets)
  listAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.account.findMany({
      where: {
        wallet: { userId: ctx.user.id },
        isArchived: false,
      },
      include: { wallet: { select: { name: true } } },
      orderBy: { sortOrder: 'asc' },
    })
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findUnique({
        where: { id: input.id },
        include: { bankConnection: true, wallet: true },
      })
      if (!account) throw new TRPCError({ code: 'NOT_FOUND' })
      return account
    }),

  create: protectedProcedure
    .input(createAccountSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify wallet ownership
      const wallet = await ctx.prisma.wallet.findFirst({
        where: {
          id: input.walletId,
          OR: [
            { userId: ctx.user.id },
            { project: { ownerId: ctx.user.id } },
          ],
        },
      })
      if (!wallet) throw new TRPCError({ code: 'FORBIDDEN' })

      const maxOrder = await ctx.prisma.account.aggregate({
        where: { walletId: input.walletId },
        _max: { sortOrder: true },
      })

      return ctx.prisma.account.create({
        data: {
          ...input,
          balance: input.initialBalance,
          sortOrder: (maxOrder._max.sortOrder || 0) + 1,
        },
      })
    }),

  update: protectedProcedure
    .input(updateAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.account.update({ where: { id }, data })
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.account.update({
        where: { id: input.id },
        data: { isArchived: true },
      })
    }),

  reorder: protectedProcedure
    .input(z.object({
      walletId: z.string().cuid(),
      accountIds: z.array(z.string().cuid()),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.accountIds.map((id, index) =>
          ctx.prisma.account.update({
            where: { id },
            data: { sortOrder: index },
          })
        )
      )
      return { success: true }
    }),

  // Recalculate balance from transactions
  recalculate: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findUnique({ where: { id: input.id } })
      if (!account) throw new TRPCError({ code: 'NOT_FOUND' })

      const [income, expense] = await Promise.all([
        ctx.prisma.transaction.aggregate({
          where: { accountId: input.id, type: 'INCOME' },
          _sum: { amount: true },
        }),
        ctx.prisma.transaction.aggregate({
          where: { accountId: input.id, type: 'EXPENSE' },
          _sum: { amount: true },
        }),
      ])

      const calculatedBalance =
        Number(account.initialBalance) +
        Number(income._sum.amount || 0) -
        Number(expense._sum.amount || 0)

      return ctx.prisma.account.update({
        where: { id: input.id },
        data: { balance: calculatedBalance },
      })
    }),
})
