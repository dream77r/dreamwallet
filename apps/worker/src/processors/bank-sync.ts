import type { Job, Processor } from 'bullmq'
import { prisma } from '@dreamwallet/db'
import { TochkaProvider } from '@dreamwallet/bank-integrations'

interface BankSyncData {
  bankConnectionId: string
}

export const bankSyncProcessor: Processor<BankSyncData> = async (job: Job<BankSyncData>) => {
  const { bankConnectionId } = job.data

  const connection = await prisma.bankConnection.findUnique({
    where: { id: bankConnectionId },
    include: { account: true },
  })

  if (!connection) throw new Error(`Bank connection ${bankConnectionId} not found`)
  if (connection.status !== 'ACTIVE') throw new Error(`Connection is ${connection.status}`)

  // Create sync log
  const syncLog = await prisma.bankSyncLog.create({
    data: {
      bankConnectionId,
      status: 'in_progress',
      startedAt: new Date(),
    },
  })

  try {
    // Decrypt credentials
    const credentials = JSON.parse(connection.credentials || '{}')

    // Get provider
    let provider
    if (connection.provider === 'TOCHKA') {
      provider = new TochkaProvider(
        process.env.TOCHKA_CLIENT_ID || '',
        process.env.TOCHKA_CLIENT_SECRET || '',
      )
    } else {
      throw new Error(`Unsupported provider: ${connection.provider}`)
    }

    // Fetch transactions
    const from = connection.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const to = new Date()

    const transactions = await provider.getTransactions(
      credentials.accessToken,
      connection.externalId || '',
      from,
      to,
    )

    let added = 0
    let skipped = 0

    for (const tx of transactions) {
      // Deduplicate by reference
      const existing = await prisma.transaction.findFirst({
        where: {
          accountId: connection.accountId,
          reference: tx.externalId,
        },
      })

      if (existing) {
        skipped++
        continue
      }

      const type = tx.type === 'credit' ? 'INCOME' : 'EXPENSE'
      const amount = Math.abs(tx.amount)

      await prisma.transaction.create({
        data: {
          accountId: connection.accountId,
          type,
          amount,
          currency: tx.currency,
          date: tx.date,
          description: tx.description,
          counterparty: tx.counterparty,
          reference: tx.externalId,
          source: 'BANK_SYNC',
        },
      })

      // Update account balance
      await prisma.account.update({
        where: { id: connection.accountId },
        data: {
          balance: { [type === 'INCOME' ? 'increment' : 'decrement']: amount },
        },
      })

      added++
    }

    // Update sync state
    await prisma.bankConnection.update({
      where: { id: bankConnectionId },
      data: { lastSyncAt: new Date() },
    })

    await prisma.bankSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'success',
        transactionsAdded: added,
        transactionsSkipped: skipped,
        completedAt: new Date(),
      },
    })

    // Trigger categorization for new transactions
    if (added > 0) {
      await job.queue?.add('categorize-after-sync', {
        accountId: connection.accountId,
        since: from.toISOString(),
      })
    }

    return { added, skipped }
  } catch (error) {
    await prisma.bankSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      },
    })

    // Mark connection as error if auth failed
    if (error instanceof Error && error.message.includes('401')) {
      await prisma.bankConnection.update({
        where: { id: bankConnectionId },
        data: { status: 'EXPIRED', errorMessage: 'Token expired' },
      })
    }

    throw error
  }
}
