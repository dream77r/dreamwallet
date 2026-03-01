import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

// ─── Helpers ────────────────────────────────────────────────────────────────

const SCHEDULES = {
  daily:     '0 9 * * *',
  weekly:    '0 9 * * 1',
  monthly:   '0 9 1 * *',
  quarterly: '0 9 1 */3 *',
  yearly:    '0 9 1 1 *',
} as const

type ScheduleKey = keyof typeof SCHEDULES

/** Вычисляет следующую дату запуска на основе расписания */
function getNextRunAt(schedule: string): Date {
  const now = new Date()
  const next = new Date(now)
  next.setHours(9, 0, 0, 0)

  const key = (Object.entries(SCHEDULES).find(([, v]) => v === schedule)?.[0] ?? 'monthly') as ScheduleKey

  switch (key) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3, 1)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1, 0, 1)
      break
    case 'monthly':
    default:
      next.setMonth(next.getMonth() + 1, 1)
  }

  return next
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const recurringRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Возвращаем правила, у которых есть транзакции, принадлежащие кошельку пользователя
    return ctx.prisma.recurringRule.findMany({
      where: {
        transactions: {
          some: {
            account: {
              wallet: {
                userId: ctx.user.id,
              },
            },
          },
        },
      },
      include: {
        transactions: {
          take: 1,
          select: { accountId: true, account: { select: { name: true, currency: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ isActive: 'desc' }, { nextRunAt: 'asc' }],
    })
  }),

  create: protectedProcedure
    .input(
      z.object({
        name:      z.string().min(1).max(100),
        amount:    z.number().positive(),
        type:      z.enum(['INCOME', 'EXPENSE']),
        accountId: z.string().cuid(),
        schedule:  z.enum(['0 9 * * *', '0 9 * * 1', '0 9 1 * *', '0 9 1 */3 *', '0 9 1 1 *']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Убедимся, что счёт принадлежит пользователю
      const account = await ctx.prisma.account.findFirst({
        where: { id: input.accountId, wallet: { userId: ctx.user.id } },
      })
      if (!account) throw new Error('Счёт не найден')

      const nextRunAt = getNextRunAt(input.schedule)

      return ctx.prisma.$transaction(async (tx) => {
        const rule = await tx.recurringRule.create({
          data: {
            name:      input.name,
            amount:    input.amount,
            type:      input.type,
            schedule:  input.schedule,
            nextRunAt,
            isActive:  true,
          },
        })

        // Создаём первую "якорную" транзакцию, которая связывает правило с аккаунтом
        await tx.transaction.create({
          data: {
            accountId:       input.accountId,
            type:            input.type,
            amount:          input.amount,
            currency:        account.currency,
            date:            new Date(),
            description:     input.name,
            source:          'RECURRING',
            recurringRuleId: rule.id,
          },
        })

        return rule
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id:       z.string().cuid(),
        name:     z.string().min(1).max(100).optional(),
        amount:   z.number().positive().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Проверяем владение через транзакции
      const rule = await ctx.prisma.recurringRule.findFirst({
        where: {
          id: input.id,
          transactions: { some: { account: { wallet: { userId: ctx.user.id } } } },
        },
      })
      if (!rule) throw new Error('Правило не найдено')

      const { id, ...data } = input
      return ctx.prisma.recurringRule.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.prisma.recurringRule.findFirst({
        where: {
          id: input.id,
          transactions: { some: { account: { wallet: { userId: ctx.user.id } } } },
        },
      })
      if (!rule) throw new Error('Правило не найдено')

      await ctx.prisma.recurringRule.delete({ where: { id: input.id } })
      return { success: true }
    }),
})
