import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const debtsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) =>
    ctx.prisma.debt.findMany({ where: { userId: ctx.user.id }, orderBy: { createdAt: 'desc' } })
  ),

  create: protectedProcedure
    .input(z.object({
      type: z.enum(['LENT', 'BORROWED']),
      counterparty: z.string().min(1).max(100),
      amount: z.number().positive(),
      currency: z.string().default('RUB'),
      description: z.string().optional(),
      dueDate: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) =>
      ctx.prisma.debt.create({
        data: { ...input, userId: ctx.user.id, dueDate: input.dueDate ? new Date(input.dueDate) : undefined },
      })
    ),

  repay: protectedProcedure
    .input(z.object({ id: z.string(), amount: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const debt = await ctx.prisma.debt.findFirst({ where: { id: input.id, userId: ctx.user.id } })
      if (!debt) throw new TRPCError({ code: 'NOT_FOUND' })
      const newPaid = Number(debt.paidAmount) + input.amount
      const status = newPaid >= Number(debt.amount) ? 'REPAID' as const : 'PARTIALLY_REPAID' as const
      return ctx.prisma.debt.update({ where: { id: input.id }, data: { paidAmount: newPaid, status } })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const debt = await ctx.prisma.debt.findFirst({ where: { id: input.id, userId: ctx.user.id } })
      if (!debt) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.prisma.debt.delete({ where: { id: input.id } })
    }),
})
