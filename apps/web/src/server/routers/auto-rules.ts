import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const autoRulesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.autoCategoryRule.findMany({
      where:   { userId: ctx.user.id },
      include: { category: { select: { id: true, name: true, icon: true, color: true, type: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })
  }),

  create: protectedProcedure
    .input(z.object({
      categoryId: z.string().cuid(),
      field:      z.enum(['description', 'counterparty']).default('description'),
      pattern:    z.string().min(1).max(200),
      isRegex:    z.boolean().default(false),
      priority:   z.number().int().min(0).max(100).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      // Проверяем, что категория принадлежит пользователю
      const category = await ctx.prisma.category.findFirst({
        where: { id: input.categoryId, userId: ctx.user.id },
      })
      if (!category) throw new Error('Категория не найдена')

      return ctx.prisma.autoCategoryRule.create({
        data: { ...input, userId: ctx.user.id, isActive: true },
        include: { category: { select: { id: true, name: true, icon: true, color: true, type: true } } },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id:         z.string().cuid(),
      categoryId: z.string().cuid().optional(),
      field:      z.enum(['description', 'counterparty']).optional(),
      pattern:    z.string().min(1).max(200).optional(),
      isRegex:    z.boolean().optional(),
      isActive:   z.boolean().optional(),
      priority:   z.number().int().min(0).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.prisma.autoCategoryRule.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!rule) throw new Error('Правило не найдено')

      const { id, ...data } = input
      return ctx.prisma.autoCategoryRule.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.prisma.autoCategoryRule.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!rule) throw new Error('Правило не найдено')
      await ctx.prisma.autoCategoryRule.delete({ where: { id: input.id } })
      return { success: true }
    }),

  /** Применяет паттерн ко всем существующим транзакциям пользователя */
  applyRuleToExisting: protectedProcedure
    .input(z.object({
      pattern:    z.string().min(1),
      field:      z.enum(['description', 'counterparty']).default('description'),
      isRegex:    z.boolean().default(false),
      categoryId: z.string().cuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify category ownership
      const category = await ctx.prisma.category.findFirst({
        where: { id: input.categoryId, userId: ctx.user.id },
        select: { id: true, type: true },
      })
      if (!category) throw new Error('Категория не найдена')

      // Get user's account ids
      const wallet = await ctx.prisma.wallet.findFirst({ where: { userId: ctx.user.id }, select: { id: true } })
      const accounts = wallet ? await ctx.prisma.account.findMany({ where: { walletId: wallet.id }, select: { id: true } }) : []
      const accountIds = accounts.map(a => a.id)
      if (accountIds.length === 0) return { updated: 0 }

      // Find matching transactions (only same type as category)
      const transactions = await ctx.prisma.transaction.findMany({
        where: {
          accountId: { in: accountIds },
          type: category.type as 'INCOME' | 'EXPENSE',
        },
        select: { id: true, description: true, counterparty: true },
        take: 1000,
      })

      const matchIds: string[] = []
      for (const tx of transactions) {
        const text = input.field === 'counterparty'
          ? (tx.counterparty ?? '')
          : (tx.description ?? '')
        const matches = input.isRegex
          ? (() => { try { return new RegExp(input.pattern, 'i').test(text) } catch { return false } })()
          : text.toLowerCase().includes(input.pattern.toLowerCase())
        if (matches) matchIds.push(tx.id)
      }

      if (matchIds.length === 0) return { updated: 0 }

      await ctx.prisma.transaction.updateMany({
        where: { id: { in: matchIds } },
        data: { categoryId: input.categoryId },
      })

      return { updated: matchIds.length }
    }),

  /** Применяет правила к одной транзакции и возвращает categoryId, если правило сработало */
  applyToTransaction: protectedProcedure
    .input(z.object({
      description:  z.string().optional(),
      counterparty: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const rules = await ctx.prisma.autoCategoryRule.findMany({
        where:   { userId: ctx.user.id, isActive: true },
        orderBy: [{ priority: 'desc' }],
      })

      for (const rule of rules) {
        const text = rule.field === 'counterparty'
          ? (input.counterparty ?? '')
          : (input.description ?? '')

        const matches = rule.isRegex
          ? new RegExp(rule.pattern, 'i').test(text)
          : text.toLowerCase().includes(rule.pattern.toLowerCase())

        if (matches) return { categoryId: rule.categoryId, ruleName: rule.pattern }
      }
      return null
    }),
})
