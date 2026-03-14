import type { Processor } from 'bullmq'
import { prisma } from '@dreamwallet/db'
import pino from 'pino'

const logger = pino({ name: 'crypto-sync' })

/**
 * Crypto auto-sync processor.
 * Runs on a cron schedule (every 30 min), syncs all crypto accounts
 * whose lastSyncAt is older than their configured syncIntervalMin.
 *
 * Uses dynamic import for crypto-sync lib (it's in the web app package).
 */
export const cryptoSyncProcessor: Processor = async () => {
  const accounts = await prisma.account.findMany({
    where: {
      type: 'CRYPTO',
      isArchived: false,
      cryptoAddress: { not: null },
      syncIntervalMin: { not: null },  // only accounts with auto-sync enabled
    },
  })

  if (accounts.length === 0) {
    logger.info('No crypto accounts with auto-sync enabled')
    return { synced: 0, errors: 0 }
  }

  let synced = 0
  let errors = 0
  const now = Date.now()

  for (const account of accounts) {
    const intervalMs = (account.syncIntervalMin ?? 60) * 60 * 1000
    if (account.lastSyncAt && now - account.lastSyncAt.getTime() < intervalMs) {
      continue // not stale yet
    }

    try {
      // Import sync function dynamically to avoid circular deps
      const { syncCryptoAccount } = await import('./crypto-sync-lib')
      const result = await syncCryptoAccount(account.id, prisma)
      logger.info({
        accountId: account.id,
        network: account.cryptoNetwork,
        added: result.added,
        skipped: result.skipped,
      }, 'Crypto account synced')
      synced++
    } catch (err) {
      logger.error({
        accountId: account.id,
        error: err instanceof Error ? err.message : String(err),
      }, 'Crypto sync failed')
      errors++
    }
  }

  logger.info({ synced, errors, total: accounts.length }, 'Crypto auto-sync completed')
  return { synced, errors }
}
