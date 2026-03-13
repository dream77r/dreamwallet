import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import {
  upsertIncomeRuleSchema,
  createPayoutSchema,
  getIncomeDistributionSchema,
} from '@dreamwallet/shared'

export const incomeRouter = router({
  getRules: protectedProcedure
    .input(z.object({ projectId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id } } },
          ],
        },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' })

      return ctx.prisma.incomeRule.findMany({
        where: { projectId: input.projectId },
        include: {
          member: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
        },
      })
    }),

  upsertRule: protectedProcedure
    .input(upsertIncomeRuleSchema)
    .mutation(async ({ ctx, input }) => {
      // Only OWNER can manage rules
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, ownerId: ctx.user.id },
      })
      if (!project) throw new TRPCError({ code: 'FORBIDDEN', message: 'Только владелец может управлять правилами' })

      // Validate: total PERCENTAGE <= 100
      if (input.type === 'PERCENTAGE') {
        const existing = await ctx.prisma.incomeRule.findMany({
          where: {
            projectId: input.projectId,
            type: 'PERCENTAGE',
            memberId: { not: input.memberId },
          },
        })
        const totalPct = existing.reduce((sum, r) => sum + Number(r.value), 0) + input.value
        if (totalPct > 100) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Сумма процентов не может превышать 100% (сейчас ${totalPct}%)`,
          })
        }
      }

      return ctx.prisma.incomeRule.upsert({
        where: {
          projectId_memberId: {
            projectId: input.projectId,
            memberId: input.memberId,
          },
        },
        update: { type: input.type, value: input.value },
        create: {
          projectId: input.projectId,
          memberId: input.memberId,
          type: input.type,
          value: input.value,
        },
      })
    }),

  deleteRule: protectedProcedure
    .input(z.object({ projectId: z.string().cuid(), memberId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, ownerId: ctx.user.id },
      })
      if (!project) throw new TRPCError({ code: 'FORBIDDEN' })

      await ctx.prisma.incomeRule.delete({
        where: {
          projectId_memberId: {
            projectId: input.projectId,
            memberId: input.memberId,
          },
        },
      })
      return { success: true }
    }),

  getDistribution: protectedProcedure
    .input(getIncomeDistributionSchema)
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id } } },
          ],
        },
        include: {
          wallet: { include: { accounts: { select: { id: true } } } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
              incomeRule: true,
              payouts: true,
            },
          },
        },
      })
      if (!project?.wallet) throw new TRPCError({ code: 'NOT_FOUND' })

      // Period date range
      const [year, month] = input.period.split('-').map(Number)
      const from = new Date(year, month - 1, 1)
      const to = new Date(year, month, 0, 23, 59, 59, 999)

      const accountIds = project.wallet.accounts.map(a => a.id)

      const [revenueAgg, expenseAgg] = await Promise.all([
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
        ctx.prisma.transaction.aggregate({
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
      ])

      const revenue = Number(revenueAgg._sum.amount || 0)
      const expenses = Number(expenseAgg._sum.amount || 0)

      // Distribution calculation
      const members = project.members
      const ownerMember = members.find(m => m.role === 'OWNER')

      // 1. FIXED first
      let remaining = revenue
      const distribution = members.map(m => {
        const rule = m.incomeRule
        const periodPayouts = m.payouts.filter(p => p.period === input.period)
        const totalPaid = periodPayouts.reduce((sum, p) => sum + Number(p.amount), 0)

        return {
          memberId: m.id,
          userId: m.user.id,
          name: m.user.name ?? m.user.email,
          avatarUrl: m.user.avatarUrl,
          role: m.role,
          ruleType: rule?.type ?? null,
          ruleValue: rule ? Number(rule.value) : null,
          earned: 0,
          paid: totalPaid,
          balance: 0,
        }
      })

      // Calculate FIXED amounts
      const fixedMembers = distribution.filter(d => d.ruleType === 'FIXED')
      const totalFixed = fixedMembers.reduce((sum, d) => sum + (d.ruleValue ?? 0), 0)

      if (revenue >= totalFixed) {
        fixedMembers.forEach(d => { d.earned = d.ruleValue ?? 0 })
        remaining -= totalFixed
      } else {
        // Proportional reduction
        fixedMembers.forEach(d => {
          d.earned = revenue > 0 ? ((d.ruleValue ?? 0) / totalFixed) * revenue : 0
        })
        remaining = 0
      }

      // 2. PERCENTAGE from remainder
      const pctMembers = distribution.filter(d => d.ruleType === 'PERCENTAGE')
      pctMembers.forEach(d => {
        d.earned = remaining > 0 ? (remaining * (d.ruleValue ?? 0)) / 100 : 0
      })
      const totalPct = pctMembers.reduce((sum, d) => sum + d.earned, 0)

      // 3. Owner = remainder
      const ownerDist = distribution.find(d => d.memberId === ownerMember?.id)
      if (ownerDist && !ownerDist.ruleType) {
        ownerDist.earned = remaining - totalPct
      }

      // Calculate balance
      distribution.forEach(d => { d.balance = d.earned - d.paid })

      return {
        period: input.period,
        revenue,
        expenses,
        profit: revenue - expenses,
        totalFixed,
        distribution,
      }
    }),

  createPayout: protectedProcedure
    .input(createPayoutSchema)
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, ownerId: ctx.user.id },
      })
      if (!project) throw new TRPCError({ code: 'FORBIDDEN', message: 'Только владелец может создавать выплаты' })

      return ctx.prisma.payout.create({
        data: {
          projectId: input.projectId,
          memberId: input.memberId,
          amount: input.amount,
          period: input.period,
          note: input.note,
        },
      })
    }),

  getPayouts: protectedProcedure
    .input(z.object({
      projectId: z.string().cuid(),
      period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findFirst({
        where: {
          id: input.projectId,
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id } } },
          ],
        },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' })

      return ctx.prisma.payout.findMany({
        where: {
          projectId: input.projectId,
          ...(input.period ? { period: input.period } : {}),
        },
        include: {
          member: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
        },
        orderBy: { paidAt: 'desc' },
      })
    }),
})
