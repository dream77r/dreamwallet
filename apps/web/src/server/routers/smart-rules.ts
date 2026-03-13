import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const smartRulesRouter = router({
  listSuggestions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.smartRuleSuggestion.findMany({
      where: { userId: ctx.user.id, status: 'PENDING' },
      include: { category: { select: { id: true, name: true, icon: true } } },
      orderBy: [{ confidence: 'desc' }, { matchCount: 'desc' }],
    })
  }),

  acceptSuggestion: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const suggestion = await ctx.prisma.smartRuleSuggestion.findFirst({
        where: { id: input.id, userId: ctx.user.id, status: 'PENDING' },
      })
      if (!suggestion) throw new TRPCError({ code: 'NOT_FOUND' })

      // Create auto-category rule
      await ctx.prisma.$transaction([
        ctx.prisma.autoCategoryRule.create({
          data: {
            userId: ctx.user.id,
            categoryId: suggestion.categoryId,
            field: suggestion.field,
            pattern: suggestion.pattern,
            isRegex: false,
            priority: 5,
            isActive: true,
          },
        }),
        ctx.prisma.smartRuleSuggestion.update({
          where: { id: input.id },
          data: { status: 'ACCEPTED' },
        }),
      ])

      // Apply to existing uncategorized transactions
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
      if (wallet) {
        const accounts = await ctx.prisma.account.findMany({
          where: { walletId: wallet.id },
          select: { id: true },
        })
        const accountIds = accounts.map(a => a.id)

        const txs = await ctx.prisma.transaction.findMany({
          where: {
            accountId: { in: accountIds },
            categoryId: null,
            [suggestion.field]: { contains: suggestion.pattern, mode: 'insensitive' },
          },
          select: { id: true },
          take: 500,
        })

        if (txs.length > 0) {
          await ctx.prisma.transaction.updateMany({
            where: { id: { in: txs.map(t => t.id) } },
            data: { categoryId: suggestion.categoryId },
          })
        }

        return { applied: txs.length }
      }

      return { applied: 0 }
    }),

  rejectSuggestion: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.smartRuleSuggestion.updateMany({
        where: { id: input.id, userId: ctx.user.id },
        data: { status: 'REJECTED' },
      })
      return { success: true }
    }),
})
