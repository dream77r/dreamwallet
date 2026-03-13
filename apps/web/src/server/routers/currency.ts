import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { getLatestRates, convertAmount, syncCBRRates } from '@/lib/exchange-rates'

export const currencyRouter = router({
  getRates: protectedProcedure.query(async () => {
    return getLatestRates()
  }),

  convert: protectedProcedure
    .input(z.object({
      amount: z.number(),
      from: z.string().length(3),
      to: z.string().length(3),
      date: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const date = input.date ? new Date(input.date) : undefined
      const result = await convertAmount(input.amount, input.from, input.to, date)
      if (!result) return { converted: null, rate: null }
      return result
    }),

  getHistory: protectedProcedure
    .input(z.object({
      from: z.string().length(3),
      to: z.string().length(3),
      days: z.number().int().min(7).max(365).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const since = new Date()
      since.setDate(since.getDate() - input.days)

      return ctx.prisma.exchangeRate.findMany({
        where: {
          fromCur: input.from,
          toCur: input.to,
          date: { gte: since },
        },
        orderBy: { date: 'asc' },
        select: { date: true, rate: true },
      })
    }),

  syncRates: protectedProcedure.mutation(async () => {
    const count = await syncCBRRates()
    return { synced: count }
  }),
})
