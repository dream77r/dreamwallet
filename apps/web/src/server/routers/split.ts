import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import crypto from 'crypto'

export const splitRouter = router({
  createGroup: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      currency: z.string().default('RUB'),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.prisma.splitGroup.create({
        data: {
          name: input.name,
          currency: input.currency,
          createdById: ctx.user.id,
          shareToken: crypto.randomBytes(16).toString('hex'),
          participants: {
            create: { userId: ctx.user.id },
          },
        },
        include: { participants: { include: { user: { select: { id: true, name: true } } } } },
      })
      return group
    }),

  addParticipant: protectedProcedure
    .input(z.object({
      groupId: z.string().cuid(),
      userId: z.string().cuid().optional(),
      externalName: z.string().optional(),
      externalEmail: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.prisma.splitGroup.findFirst({
        where: { id: input.groupId, createdById: ctx.user.id },
      })
      if (!group) throw new TRPCError({ code: 'NOT_FOUND' })

      return ctx.prisma.splitParticipant.create({
        data: {
          groupId: input.groupId,
          userId: input.userId,
          externalName: input.externalName,
          externalEmail: input.externalEmail,
        },
        include: { user: { select: { id: true, name: true } } },
      })
    }),

  addExpense: protectedProcedure
    .input(z.object({
      groupId: z.string().cuid(),
      paidById: z.string().cuid(),
      description: z.string().min(1),
      amount: z.number().positive(),
      splitType: z.enum(['equal', 'custom', 'percent']).default('equal'),
      shares: z.array(z.object({
        participantId: z.string().cuid(),
        amount: z.number().min(0),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.prisma.splitGroup.findFirst({
        where: { id: input.groupId, participants: { some: { userId: ctx.user.id } } },
        include: { participants: true },
      })
      if (!group) throw new TRPCError({ code: 'NOT_FOUND' })

      let sharesToCreate: Array<{ participantId: string; amount: number }>

      if (input.splitType === 'equal') {
        const perPerson = Math.round((input.amount / group.participants.length) * 100) / 100
        sharesToCreate = group.participants.map(p => ({
          participantId: p.id,
          amount: perPerson,
        }))
      } else if (input.shares) {
        sharesToCreate = input.shares
      } else {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Shares required for custom/percent split' })
      }

      return ctx.prisma.splitExpense.create({
        data: {
          groupId: input.groupId,
          paidById: input.paidById,
          description: input.description,
          amount: input.amount,
          splitType: input.splitType,
          shares: { create: sharesToCreate },
        },
        include: { shares: true, paidBy: { include: { user: { select: { name: true } } } } },
      })
    }),

  settlePayment: protectedProcedure
    .input(z.object({
      groupId: z.string().cuid(),
      fromId: z.string().cuid(),
      toId: z.string().cuid(),
      amount: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.splitPayment.create({
        data: input,
      })
    }),

  getGroup: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.prisma.splitGroup.findFirst({
        where: { id: input.id, participants: { some: { userId: ctx.user.id } } },
        include: {
          participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          expenses: {
            include: {
              shares: true,
              paidBy: { include: { user: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      })
      if (!group) throw new TRPCError({ code: 'NOT_FOUND' })

      // Get payments
      const payments = await ctx.prisma.splitPayment.findMany({
        where: { groupId: input.id },
      })

      return { ...group, payments }
    }),

  listGroups: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.splitGroup.findMany({
      where: { participants: { some: { userId: ctx.user.id } } },
      include: {
        participants: { include: { user: { select: { name: true } } } },
        _count: { select: { expenses: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }),

  getShareLink: protectedProcedure
    .input(z.object({ groupId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.prisma.splitGroup.findFirst({
        where: { id: input.groupId, createdById: ctx.user.id },
        select: { shareToken: true },
      })
      if (!group) throw new TRPCError({ code: 'NOT_FOUND' })

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://dreamwallet.brewos.ru'
      return { link: `${baseUrl}/share/split/${group.shareToken}` }
    }),
})
