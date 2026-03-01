import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const tagsRouter = router({
  // List all tags for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.tag.findMany({
      where: { userId: ctx.user.id },
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: { name: 'asc' },
    })
  }),

  // Create a new tag
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(32).trim(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.tag.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          color: input.color ?? '#6366f1',
        },
      })
    }),

  // Update tag (name / color)
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(32).trim().optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tag = await ctx.prisma.tag.findFirst({ where: { id: input.id, userId: ctx.user.id } })
      if (!tag) throw new TRPCError({ code: 'NOT_FOUND' })

      const { id, ...data } = input
      return ctx.prisma.tag.update({ where: { id }, data })
    }),

  // Delete a tag
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tag = await ctx.prisma.tag.findFirst({ where: { id: input.id, userId: ctx.user.id } })
      if (!tag) throw new TRPCError({ code: 'NOT_FOUND' })
      return ctx.prisma.tag.delete({ where: { id: input.id } })
    }),

  // Add tag to transaction (by tag id)
  addToTransaction: protectedProcedure
    .input(z.object({
      transactionId: z.string(),
      tagId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const tx = await ctx.prisma.transaction.findFirst({
        where: {
          id: input.transactionId,
          account: { wallet: { userId: ctx.user.id } },
        },
      })
      if (!tx) throw new TRPCError({ code: 'NOT_FOUND' })

      const tag = await ctx.prisma.tag.findFirst({ where: { id: input.tagId, userId: ctx.user.id } })
      if (!tag) throw new TRPCError({ code: 'NOT_FOUND' })

      return ctx.prisma.tagOnTransaction.create({
        data: { transactionId: input.transactionId, tagId: input.tagId },
      })
    }),

  // Remove tag from transaction
  removeFromTransaction: protectedProcedure
    .input(z.object({
      transactionId: z.string(),
      tagId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.tagOnTransaction.delete({
        where: {
          transactionId_tagId: {
            transactionId: input.transactionId,
            tagId: input.tagId,
          },
        },
      })
    }),

  // Get or create tag by name (used from transaction form)
  getOrCreate: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(32).trim(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.tag.upsert({
        where: { userId_name: { userId: ctx.user.id, name: input.name } },
        create: { userId: ctx.user.id, name: input.name, color: input.color ?? '#6366f1' },
        update: {},
      })
    }),
})
