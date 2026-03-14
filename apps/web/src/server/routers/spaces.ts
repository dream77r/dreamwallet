import { router, protectedProcedure } from '../trpc'

export const spacesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const [projects, familyWallets, splitGroups] = await Promise.all([
      ctx.prisma.project.findMany({
        where: {
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id } } },
          ],
          status: 'ACTIVE',
        },
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          wallet: { include: { accounts: { select: { id: true, balance: true } } } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      ctx.prisma.familyWallet.findMany({
        where: {
          members: { some: { userId: ctx.user.id } },
        },
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          wallet: { include: { accounts: { select: { id: true, balance: true } } } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      ctx.prisma.splitGroup.findMany({
        where: {
          OR: [
            { createdById: ctx.user.id },
            { participants: { some: { userId: ctx.user.id } } },
          ],
        },
        include: {
          participants: { select: { id: true, externalName: true, user: { select: { id: true, name: true } } } },
          _count: { select: { expenses: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ])

    return { projects, familyWallets, splitGroups }
  }),
})
