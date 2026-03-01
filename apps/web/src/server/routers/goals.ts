import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const goalsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.goal.findMany({
      where:   { userId: ctx.user.id },
      orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
    })
  }),

  create: protectedProcedure
    .input(z.object({
      name:          z.string().min(1).max(100),
      targetAmount:  z.number().positive(),
      currentAmount: z.number().min(0).default(0),
      deadline:      z.coerce.date().optional(),
      icon:          z.string().max(4).optional(),
      color:         z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.goal.create({
        data: {
          ...input,
          userId:      ctx.user.id,
          isCompleted: (input.currentAmount ?? 0) >= input.targetAmount,
        },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id:            z.string().cuid(),
      name:          z.string().min(1).max(100).optional(),
      targetAmount:  z.number().positive().optional(),
      currentAmount: z.number().min(0).optional(),
      deadline:      z.coerce.date().nullable().optional(),
      icon:          z.string().max(4).optional(),
      color:         z.string().optional(),
      isCompleted:   z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.prisma.goal.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!goal) throw new Error('Цель не найдена')

      const { id, ...data } = input

      // Авто-завершение если сумма достигнута
      const newCurrent = data.currentAmount ?? Number(goal.currentAmount)
      const newTarget  = data.targetAmount  ?? Number(goal.targetAmount)
      const autoCompleted = newCurrent >= newTarget

      return ctx.prisma.goal.update({
        where: { id },
        data:  { ...data, isCompleted: data.isCompleted ?? autoCompleted },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.prisma.goal.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!goal) throw new Error('Цель не найдена')
      await ctx.prisma.goal.delete({ where: { id: input.id } })
      return { success: true }
    }),

  /** Добавить сумму к текущему прогрессу */
  addProgress: protectedProcedure
    .input(z.object({
      id:     z.string().cuid(),
      amount: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const goal = await ctx.prisma.goal.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!goal) throw new Error('Цель не найдена')

      const newAmount = Number(goal.currentAmount) + input.amount
      const completed = newAmount >= Number(goal.targetAmount)

      return ctx.prisma.goal.update({
        where: { id: input.id },
        data:  { currentAmount: newAmount, isCompleted: completed },
      })
    }),
})
