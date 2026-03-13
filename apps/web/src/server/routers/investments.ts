import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { fetchQuote } from '@/lib/stock-api'

export const investmentsRouter = router({
  listPositions: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
    if (!wallet) return []

    const accounts = await ctx.prisma.account.findMany({
      where: { walletId: wallet.id, type: 'INVESTMENT' },
      select: { id: true },
    })

    return ctx.prisma.investmentPosition.findMany({
      where: { accountId: { in: accounts.map(a => a.id) } },
      include: { account: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    })
  }),

  addPosition: protectedProcedure
    .input(z.object({
      accountId: z.string().cuid(),
      ticker: z.string().min(1).max(20).transform(s => s.toUpperCase()),
      name: z.string().optional(),
      quantity: z.number().positive(),
      avgPrice: z.number().positive(),
      currency: z.string().default('RUB'),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.investmentPosition.upsert({
        where: { accountId_ticker: { accountId: input.accountId, ticker: input.ticker } },
        create: input,
        update: {
          quantity: { increment: input.quantity },
          // Recalculate avg price with DCA
          avgPrice: input.avgPrice,
        },
      })
    }),

  getPortfolio: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id } })
    if (!wallet) return { positions: [], totalValue: 0, totalCost: 0, totalPnL: 0 }

    const accounts = await ctx.prisma.account.findMany({
      where: { walletId: wallet.id, type: 'INVESTMENT' },
      select: { id: true },
    })

    const positions = await ctx.prisma.investmentPosition.findMany({
      where: { accountId: { in: accounts.map(a => a.id) } },
      include: { account: { select: { name: true } } },
    })

    // Get current prices
    const enriched = await Promise.all(positions.map(async (pos) => {
      const quote = await fetchQuote(pos.ticker)
      const currentPrice = quote?.price ?? Number(pos.avgPrice)
      const quantity = Number(pos.quantity)
      const avgPrice = Number(pos.avgPrice)
      const value = currentPrice * quantity
      const cost = avgPrice * quantity
      const pnl = value - cost
      const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0

      return {
        ...pos,
        quantity,
        avgPrice,
        currentPrice,
        value: Math.round(value),
        cost: Math.round(cost),
        pnl: Math.round(pnl),
        pnlPercent: Math.round(pnlPercent * 100) / 100,
      }
    }))

    const totalValue = enriched.reduce((s, p) => s + p.value, 0)
    const totalCost = enriched.reduce((s, p) => s + p.cost, 0)

    return {
      positions: enriched,
      totalValue,
      totalCost,
      totalPnL: totalValue - totalCost,
    }
  }),

  addDividend: protectedProcedure
    .input(z.object({
      positionId: z.string().cuid(),
      amount: z.number().positive(),
      date: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.dividendPayment.create({
        data: {
          positionId: input.positionId,
          amount: input.amount,
          date: new Date(input.date),
        },
      })
    }),
})
