import type { Job, Processor } from 'bullmq'
import { prisma } from '@dreamwallet/db'
import { TochkaProvider } from '@dreamwallet/bank-integrations'
import { createSaltEdgeClient } from '@dreamwallet/bank-integrations/salt-edge'

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

    // Fetch transactions
    const from = connection.lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const to = new Date()

    let transactions: Array<{ externalId: string; type: string; amount: number; currency: string; date: Date; description: string; counterparty?: string }>

    if (connection.provider === 'TOCHKA') {
      const provider = new TochkaProvider(
        process.env.TOCHKA_CLIENT_ID || '',
        process.env.TOCHKA_CLIENT_SECRET || '',
      )
      transactions = await provider.getTransactions(
        credentials.accessToken,
        connection.externalId || '',
        from,
        to,
      )
    } else if (connection.provider === 'SALT_EDGE') {
      const client = createSaltEdgeClient({
        appId: process.env.SALT_EDGE_APP_ID || '',
        secret: process.env.SALT_EDGE_SECRET || '',
      })
      const rawTxs = await client.listTransactions(connection.externalId || '', {
        fromDate: from.toISOString().slice(0, 10),
        toDate: to.toISOString().slice(0, 10),
        accountId: credentials.saltEdgeAccountId,
      })
      transactions = rawTxs.map(t => ({
        externalId: t.id,
        type: t.mode === 'normal' && t.amount > 0 ? 'credit' : 'debit',
        amount: Math.abs(t.amount),
        currency: t.currency_code,
        date: new Date(t.made_on),
        description: t.description,
        counterparty: t.extra?.merchant_id,
      }))
    } else {
      throw new Error(`Unsupported provider: ${connection.provider}`)
    }

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
