import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { createCategorySchema } from '@dreamwallet/shared'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@dreamwallet/shared'

export const categoryRouter = router({
  list: protectedProcedure
    .input(z.object({
      type: z.enum(['INCOME', 'EXPENSE']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.category.findMany({
        where: {
          userId: ctx.user.id,
          ...(input?.type && { type: input.type }),
        },
        include: { children: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
    }),

  create: protectedProcedure
    .input(createCategorySchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.category.create({
        data: { ...input, userId: ctx.user.id },
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().cuid(),
      name: z.string().min(1).max(50).optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      parentId: z.string().cuid().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.category.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // Move transactions to "uncategorized"
      await ctx.prisma.transaction.updateMany({
        where: { categoryId: input.id },
        data: { categoryId: null },
      })
      await ctx.prisma.category.delete({ where: { id: input.id } })
      return { success: true }
    }),

  reorder: protectedProcedure
    .input(z.object({ categoryIds: z.array(z.string().cuid()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.categoryIds.map((id, index) =>
          ctx.prisma.category.update({ where: { id }, data: { sortOrder: index } })
        )
      )
      return { success: true }
    }),

  // Seed default categories for new user
  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await ctx.prisma.category.count({ where: { userId: ctx.user.id } })
    if (existing > 0) return { created: 0 }

    const categories = [
      ...DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
        userId: ctx.user.id,
        name: c.name,
        type: 'EXPENSE' as const,
        icon: c.icon,
        color: c.color,
        isDefault: true,
        sortOrder: i,
      })),
      ...DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
        userId: ctx.user.id,
        name: c.name,
        type: 'INCOME' as const,
        icon: c.icon,
        color: c.color,
        isDefault: true,
        sortOrder: i,
      })),
    ]

    await ctx.prisma.category.createMany({ data: categories })
    return { created: categories.length }
  }),
})
