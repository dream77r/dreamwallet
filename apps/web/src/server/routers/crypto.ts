import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { detectCryptoNetwork, type CryptoNetwork } from '@/lib/crypto-detect'
import { syncCryptoAccount, getCryptoPrice } from '@/lib/crypto-sync'

export const cryptoRouter = router({
  /** List all crypto accounts for the current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.account.findMany({
      where: {
        type: 'CRYPTO',
        isArchived: false,
        wallet: { userId: ctx.user.id },
      },
      orderBy: { createdAt: 'desc' },
    })
  }),

  /** Add a crypto wallet by address (auto-detects network, use networkHint for EVM chains) */
  addWallet: protectedProcedure
    .input(
      z.object({
        address: z.string().min(10).max(128),
        name: z.string().min(1).max(100).optional(),
        walletId: z.string().cuid(),
        networkHint: z.enum(['ethereum', 'polygon', 'arbitrum', 'bsc'] as const).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const detected = detectCryptoNetwork(input.address, input.networkHint as CryptoNetwork | undefined)
      if (!detected.network) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Не удалось определить сеть по адресу. Поддерживаются: Ethereum, Bitcoin, Solana, TON, TRON, Polygon, Arbitrum, BSC.',
        })
      }

      // Verify wallet belongs to user
      const wallet = await ctx.prisma.wallet.findFirst({
        where: { id: input.walletId, userId: ctx.user.id },
      })
      if (!wallet) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Кошелёк не найден' })
      }

      // Check duplicate
      const existing = await ctx.prisma.account.findFirst({
        where: {
          walletId: input.walletId,
          cryptoAddress: input.address,
          cryptoNetwork: detected.network,
        },
      })
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Этот адрес уже добавлен' })
      }

      const name =
        input.name ??
        `${detected.name} ${input.address.slice(0, 6)}...${input.address.slice(-4)}`

      const account = await ctx.prisma.account.create({
        data: {
          walletId: input.walletId,
          name,
          type: 'CRYPTO',
          currency: 'RUB',
          balance: 0,
          cryptoAddress: input.address,
          cryptoNetwork: detected.network,
          cryptoSymbol: detected.symbol,
        },
      })

      return account
    }),

  /** Sync a specific crypto account */
  sync: protectedProcedure
    .input(z.object({ accountId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const account = await ctx.prisma.account.findFirst({
        where: {
          id: input.accountId,
          type: 'CRYPTO',
          wallet: { userId: ctx.user.id },
        },
      })
      if (!account) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Счёт не найден' })
      }

      return syncCryptoAccount(input.accountId, ctx.prisma)
    }),

  /** Sync all crypto accounts (skip if synced < 1h ago) */
  syncAll: protectedProcedure
    .input(z.object({ force: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const accounts = await ctx.prisma.account.findMany({
        where: {
          type: 'CRYPTO',
          isArchived: false,
          wallet: { userId: ctx.user.id },
        },
      })

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const toSync = input.force
        ? accounts
        : accounts.filter(
            (a) => !a.lastSyncAt || a.lastSyncAt < oneHourAgo,
          )

      const results = await Promise.allSettled(
        toSync.map((a) => syncCryptoAccount(a.id, ctx.prisma)),
      )

      return results.map((r, i) => ({
        accountId: toSync[i]!.id,
        result: r.status === 'fulfilled' ? r.value : { error: String(r.reason) },
      }))
    }),

  /** Get current price for a crypto symbol */
  getPrice: protectedProcedure
    .input(z.object({ symbol: z.string().min(1).max(10) }))
    .query(async ({ input }) => {
      const price = await getCryptoPrice(input.symbol)
      if (!price) {
        throw new TRPCError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Не удалось получить курс. Попробуйте позже.',
        })
      }
      return price
    }),

  /** Update crypto wallet (name, network, symbol) */
  updateWallet: protectedProcedure
    .input(z.object({
      accountId: z.string().cuid(),
      name: z.string().min(1).max(100).optional(),
      cryptoNetwork: z.string().min(1).max(20).optional(),
      cryptoSymbol: z.string().min(1).max(10).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findFirst({
        where: { id: input.accountId, type: 'CRYPTO', wallet: { userId: ctx.user.id } },
      })
      if (!account) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Счёт не найден' })
      }

      return ctx.prisma.account.update({
        where: { id: input.accountId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.cryptoNetwork !== undefined && { cryptoNetwork: input.cryptoNetwork }),
          ...(input.cryptoSymbol !== undefined && { cryptoSymbol: input.cryptoSymbol }),
        },
      })
    }),

  /** Delete crypto wallet and all its transactions */
  deleteWallet: protectedProcedure
    .input(z.object({ accountId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findFirst({
        where: { id: input.accountId, type: 'CRYPTO', wallet: { userId: ctx.user.id } },
      })
      if (!account) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Счёт не найден' })
      }

      // Delete transactions first (cascade should handle it, but be explicit)
      await ctx.prisma.transaction.deleteMany({ where: { accountId: input.accountId } })
      await ctx.prisma.account.delete({ where: { id: input.accountId } })

      return { deleted: true }
    }),

  /** Set auto-sync interval for a crypto account */
  setSyncInterval: protectedProcedure
    .input(z.object({
      accountId: z.string().cuid(),
      intervalMin: z.number().int().min(15).max(1440).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.prisma.account.findFirst({
        where: {
          id: input.accountId,
          type: 'CRYPTO',
          wallet: { userId: ctx.user.id },
        },
      })
      if (!account) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Счёт не найден' })
      }

      return ctx.prisma.account.update({
        where: { id: input.accountId },
        data: { syncIntervalMin: input.intervalMin },
      })
    }),
})
