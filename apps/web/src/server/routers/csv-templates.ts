import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

export const csvTemplatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.importTemplate.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
    })
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      columnMap: z.record(z.string(), z.string()),
      dateFormat: z.string().optional(),
      delimiter: z.string().optional(),
      skipRows: z.number().int().min(0).optional(),
      provider: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const duplicate = await ctx.prisma.importTemplate.findFirst({
        where: { userId: ctx.user.id, name: input.name },
      })

      const template = await ctx.prisma.importTemplate.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          columnMap: input.columnMap as any,
          dateFormat: input.dateFormat,
          delimiter: input.delimiter ?? ',',
          skipRows: input.skipRows ?? 0,
          provider: input.provider,
        },
      })

      return { template, duplicateName: !!duplicate }
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(100),
      columnMap: z.record(z.string(), z.string()),
      dateFormat: z.string().optional(),
      delimiter: z.string().optional(),
      skipRows: z.number().int().min(0).optional(),
      provider: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      const existing = await ctx.prisma.importTemplate.findFirst({
        where: { id, userId: ctx.user.id },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' })

      return ctx.prisma.importTemplate.update({
        where: { id },
        data: {
          name: data.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          columnMap: data.columnMap as any,
          dateFormat: data.dateFormat,
          delimiter: data.delimiter,
          skipRows: data.skipRows,
          provider: data.provider,
        },
      })
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.importTemplate.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' })

      return ctx.prisma.importTemplate.update({
        where: { id: input.id },
        data: { name: input.name },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.importTemplate.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' })

      await ctx.prisma.importTemplate.delete({ where: { id: input.id } })
      return { success: true }
    }),
})
