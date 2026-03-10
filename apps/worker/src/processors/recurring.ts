import type { Job } from 'bullmq'
import { prisma } from '@dreamwallet/db'
import pino from 'pino'

const logger = pino({ name: 'recurring-processor' })

function getNextRunAt(schedule: string): Date {
  const now = new Date()
  const next = new Date(now)
  next.setHours(9, 0, 0, 0)
  switch (schedule) {
    case '0 9 * * *': next.setDate(next.getDate() + 1); break
    case '0 9 * * 1': next.setDate(next.getDate() + 7); break
    case '0 9 1 */3 *': next.setMonth(next.getMonth() + 3, 1); break
    case '0 9 1 1 *': next.setFullYear(next.getFullYear() + 1, 0, 1); break
    default: next.setMonth(next.getMonth() + 1, 1)
  }
  return next
}

export async function recurringProcessor(_job: Job) {
  const now = new Date()
  const dueRules = await prisma.recurringRule.findMany({
    where: { isActive: true, nextRunAt: { lte: now }, accountId: { not: null } },
    include: { account: { include: { wallet: true } } },
  })

  logger.info({ count: dueRules.length }, 'Processing due recurring rules')
  let created = 0, errors = 0

  for (const rule of dueRules) {
    if (!rule.account || !rule.accountId) continue
    try {
      const absAmount = Math.abs(Number(rule.amount))
      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            accountId: rule.accountId!,
            type: rule.type,
            amount: absAmount,
            currency: rule.account!.currency,
            date: now,
            description: rule.description || rule.name,
            categoryId: rule.categoryId || null,
            source: 'RECURRING',
            recurringRuleId: rule.id,
          },
        })
        await tx.account.update({
          where: { id: rule.accountId! },
          data: { balance: { [rule.type === 'INCOME' ? 'increment' : 'decrement']: absAmount } },
        })
        await tx.recurringRule.update({
          where: { id: rule.id },
          data: { nextRunAt: getNextRunAt(rule.schedule) },
        })
      })
      created++

      // Telegram notify
      const tg = await prisma.telegramConnection.findFirst({
        where: { userId: rule.account.wallet.userId, isActive: true },
        select: { chatId: true },
      })
      const botToken = process.env.TELEGRAM_BOT_TOKEN
      if (tg?.chatId && botToken) {
        const sign = rule.type === 'INCOME' ? '+' : '-'
        const amt = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: rule.account.currency }).format(absAmount)
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: tg.chatId, text: `🔄 *Автоплатёж*\n${rule.name}\n${sign}${amt}`, parse_mode: 'Markdown' }),
        })
      }
    } catch (err) {
      logger.error({ ruleId: rule.id, err }, 'Failed to process recurring rule')
      errors++
    }
  }

  logger.info({ created, errors }, 'Recurring processing complete')
  return { created, errors }
}
