import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import crypto from 'crypto'

export const familyRouter = router({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      // Create a FAMILY wallet
      const wallet = await ctx.prisma.wallet.create({
        data: { name: input.name, type: 'FAMILY', currency: 'RUB' },
      })

      const familyWallet = await ctx.prisma.familyWallet.create({
        data: {
          name: input.name,
          walletId: wallet.id,
          members: {
            create: { userId: ctx.user.id, role: 'OWNER' },
          },
        },
        include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
      })

      return familyWallet
    }),

  get: protectedProcedure.query(async ({ ctx }) => {
    const member = await ctx.prisma.familyMember.findFirst({
      where: { userId: ctx.user.id },
      include: {
        familyWallet: {
          include: {
            wallet: { include: { accounts: true } },
            members: {
              include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
            },
          },
        },
      },
    })
    return member?.familyWallet ?? null
  }),

  invite: protectedProcedure.mutation(async ({ ctx }) => {
    const member = await ctx.prisma.familyMember.findFirst({
      where: { userId: ctx.user.id, role: { in: ['OWNER', 'ADMIN'] } },
    })
    if (!member) throw new TRPCError({ code: 'NOT_FOUND', message: 'Семейный кошелёк не найден' })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await ctx.prisma.familyInvite.create({
      data: { familyWalletId: member.familyWalletId, token, expiresAt },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://dreamwallet.brewos.ru'
    return { link: `${baseUrl}/api/family/join?token=${invite.token}`, expiresAt }
  }),

  join: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.familyInvite.findUnique({
        where: { token: input.token },
      })

      if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Приглашение недействительно или истекло' })
      }

      // Check not already a member
      const existing = await ctx.prisma.familyMember.findUnique({
        where: { familyWalletId_userId: { familyWalletId: invite.familyWalletId, userId: ctx.user.id } },
      })
      if (existing) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Вы уже участник' })

      await ctx.prisma.$transaction([
        ctx.prisma.familyMember.create({
          data: { familyWalletId: invite.familyWalletId, userId: ctx.user.id, role: 'MEMBER' },
        }),
        ctx.prisma.familyInvite.update({
          where: { id: invite.id },
          data: { usedAt: new Date() },
        }),
      ])

      return { success: true }
    }),

  setSpendingLimit: protectedProcedure
    .input(z.object({
      memberId: z.string().cuid(),
      limit: z.number().min(0).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify caller is OWNER/ADMIN
      const callerMember = await ctx.prisma.familyMember.findFirst({
        where: { userId: ctx.user.id, role: { in: ['OWNER', 'ADMIN'] } },
      })
      if (!callerMember) throw new TRPCError({ code: 'FORBIDDEN' })

      return ctx.prisma.familyMember.update({
        where: { id: input.memberId },
        data: { spendingLimit: input.limit },
      })
    }),

  removeMember: protectedProcedure
    .input(z.object({ memberId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const callerMember = await ctx.prisma.familyMember.findFirst({
        where: { userId: ctx.user.id, role: { in: ['OWNER', 'ADMIN'] } },
      })
      if (!callerMember) throw new TRPCError({ code: 'FORBIDDEN' })

      const target = await ctx.prisma.familyMember.findUnique({ where: { id: input.memberId } })
      if (!target) throw new TRPCError({ code: 'NOT_FOUND' })
      if (target.role === 'OWNER') throw new TRPCError({ code: 'FORBIDDEN', message: 'Нельзя удалить владельца' })

      await ctx.prisma.familyMember.delete({ where: { id: input.memberId } })
      return { success: true }
    }),

  getMemberSpending: protectedProcedure
    .input(z.object({ month: z.number().int().min(1).max(12), year: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.prisma.familyMember.findFirst({
        where: { userId: ctx.user.id },
        include: { familyWallet: { include: { wallet: { include: { accounts: { select: { id: true } } } } } } },
      })
      if (!member) return []

      const accountIds = member.familyWallet.wallet.accounts.map(a => a.id)
      const start = new Date(input.year, input.month - 1, 1)
      const end = new Date(input.year, input.month, 0, 23, 59, 59)

      const members = await ctx.prisma.familyMember.findMany({
        where: { familyWalletId: member.familyWalletId },
        include: { user: { select: { id: true, name: true } } },
      })

      const results = await Promise.all(members.map(async (m) => {
        const spent = await ctx.prisma.transaction.aggregate({
          where: {
            accountId: { in: accountIds },
            createdById: m.userId,
            type: 'EXPENSE',
            date: { gte: start, lte: end },
          },
          _sum: { amount: true },
        })
        return {
          memberId: m.id,
          userId: m.userId,
          name: m.user.name ?? 'Участник',
          role: m.role,
          spent: Number(spent._sum.amount ?? 0),
          limit: m.spendingLimit ? Number(m.spendingLimit) : null,
        }
      }))

      return results
    }),
})
