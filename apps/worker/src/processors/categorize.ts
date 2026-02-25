import type { Job, Processor } from 'bullmq'
import { prisma } from '@dreamwallet/db'

interface CategorizeData {
  accountId: string
  since?: string
}

export const categorizeProcessor: Processor<CategorizeData> = async (job: Job<CategorizeData>) => {
  const { accountId, since } = job.data

  // Get account owner
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { wallet: true },
  })
  if (!account?.wallet) throw new Error('Account not found')

  const userId = account.wallet.userId || account.wallet.projectId
  if (!userId) throw new Error('No owner found')

  // Get user's auto-categorization rules
  const rules = await prisma.autoCategoryRule.findMany({
    where: { userId: account.wallet.userId!, isActive: true },
    orderBy: { priority: 'desc' },
  })

  if (rules.length === 0) return { categorized: 0 }

  // Get uncategorized transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      categoryId: null,
      ...(since && { date: { gte: new Date(since) } }),
    },
  })

  let categorized = 0

  for (const tx of transactions) {
    for (const rule of rules) {
      const fieldValue = rule.field === 'counterparty' ? tx.counterparty : tx.description
      if (!fieldValue) continue

      let matches = false
      if (rule.isRegex) {
        try {
          const regex = new RegExp(rule.pattern, 'i')
          matches = regex.test(fieldValue)
        } catch {
          continue
        }
      } else {
        matches = fieldValue.toLowerCase().includes(rule.pattern.toLowerCase())
      }

      if (matches) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { categoryId: rule.categoryId },
        })
        categorized++
        break // First matching rule wins
      }
    }
  }

  return { categorized, total: transactions.length }
}
