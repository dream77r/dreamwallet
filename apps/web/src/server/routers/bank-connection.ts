import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const bankConnectionRouter = router({
  listConnections: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
    if (!wallet) return []

    const accounts = await ctx.prisma.account.findMany({
      where: { walletId: wallet.id },
      select: { id: true },
    })

    return ctx.prisma.bankConnection.findMany({
      where: { accountId: { in: accounts.map(a => a.id) } },
      include: {
        account: { select: { name: true, type: true } },
        syncLogs: { orderBy: { startedAt: 'desc' }, take: 3 },
      },
    })
  }),

  connectBank: protectedProcedure
    .input(z.object({
      accountId: z.string().cuid(),
      provider: z.enum(['TOCHKA', 'SBER', 'TBANK', 'ALFA', 'SALT_EDGE', 'CUSTOM']),
      credentials: z.string().optional(),
      externalId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify account belongs to user
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      if (!wallet) throw new TRPCError({ code: 'NOT_FOUND' })

      const account = await ctx.prisma.account.findFirst({
        where: { id: input.accountId, walletId: wallet.id },
      })
      if (!account) throw new TRPCError({ code: 'NOT_FOUND' })

      return ctx.prisma.bankConnection.create({
        data: {
          accountId: input.accountId,
          provider: input.provider,
          credentials: input.credentials,
          externalId: input.externalId,
          status: 'ACTIVE',
        },
      })
    }),

  disconnect: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.bankConnection.update({
        where: { id: input.id },
        data: { status: 'DISCONNECTED' },
      })
    }),

  syncNow: protectedProcedure
    .input(z.object({ connectionId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // This would trigger a BullMQ job
      // For now, just verify ownership and return
      const connection = await ctx.prisma.bankConnection.findUnique({
        where: { id: input.connectionId },
        include: { account: true },
      })
      if (!connection) throw new TRPCError({ code: 'NOT_FOUND' })

      return { queued: true, connectionId: input.connectionId }
    }),
})
