import type { Processor } from 'bullmq'
import pino from 'pino'
import { prisma } from '@dreamwallet/db'

const logger = pino({ name: 'proactive-advice' })

export const proactiveAdviceProcessor: Processor = async () => {
  logger.info('Running weekly proactive advice...')

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    logger.warn('OPENROUTER_API_KEY not set, skipping proactive advice')
    return
  }

  try {
    const wallets = await prisma.wallet.findMany({
      where: { type: 'PERSONAL', userId: { not: null } },
      select: { userId: true, accounts: { select: { id: true } } },
    })

    for (const wallet of wallets) {
      if (!wallet.userId) continue
      const accountIds = wallet.accounts.map(a => a.id)

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

      const [thisMonth, lastMonth] = await Promise.all([
        prisma.transaction.groupBy({
          by: ['categoryId'],
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: monthStart } },
          _sum: { amount: true },
        }),
        prisma.transaction.groupBy({
          by: ['categoryId'],
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: lastMonthStart, lte: lastMonthEnd } },
          _sum: { amount: true },
        }),
      ])

      if (thisMonth.length === 0 && lastMonth.length === 0) continue

      const catIds = [...new Set([
        ...thisMonth.map(r => r.categoryId),
        ...lastMonth.map(r => r.categoryId),
      ].filter(Boolean) as string[])]

      const categories = await prisma.category.findMany({
        where: { id: { in: catIds } },
        select: { id: true, name: true },
      })
      const catMap = new Map(categories.map(c => [c.id, c.name]))

      const thisMonthStr = thisMonth.map(r => `${catMap.get(r.categoryId ?? '') ?? 'Другое'}: ${Number(r._sum.amount ?? 0)} руб`).join(', ')
      const lastMonthStr = lastMonth.map(r => `${catMap.get(r.categoryId ?? '') ?? 'Другое'}: ${Number(r._sum.amount ?? 0)} руб`).join(', ')

      const prompt = `Ты финансовый советник. Сравни расходы пользователя за текущий и прошлый месяц. Дай 1 КОНКРЕТНЫЙ краткий совет (1-2 предложения).

Текущий месяц: ${thisMonthStr || 'нет данных'}
Прошлый месяц: ${lastMonthStr || 'нет данных'}

Совет:`

      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? '',
            'X-Title': 'DreamWallet',
          },
          body: JSON.stringify({
            model: 'anthropic/claude-haiku-4-5-20251001',
            max_tokens: 150,
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        if (!res.ok) continue

        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        const advice = data.choices?.[0]?.message?.content?.trim()

        if (advice && advice.length > 10) {
          // Save notification
          await prisma.notification.create({
            data: {
              userId: wallet.userId!,
              type: 'SYSTEM',
              title: '💡 Финансовый совет',
              body: advice,
            },
          })

          // Send to Telegram if connected
          const tg = await prisma.telegramConnection.findUnique({
            where: { userId: wallet.userId! },
          })
          if (tg?.isActive) {
            const botToken = process.env.TELEGRAM_BOT_TOKEN
            if (botToken) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: tg.chatId,
                  text: `💡 <b>Финансовый совет</b>\n\n${advice}`,
                  parse_mode: 'HTML',
                }),
              }).catch(() => {})
            }
          }
        }
      } catch (err) {
        logger.error({ userId: wallet.userId, error: err }, 'Proactive advice failed for user')
      }
    }

    logger.info('Proactive advice complete')
  } catch (err) {
    logger.error(err, 'Proactive advice processor failed')
    throw err
  }
}
