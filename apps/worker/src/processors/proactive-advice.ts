import { Job } from 'bullmq'
import { prisma } from '@dreamwallet/db'
import { callOpenRouter } from '@dreamwallet/shared'

// Helper to send Telegram message
async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

export async function processProactiveAdvice(_job: Job) {
  // Get all users with Telegram connected and notifyAdvice enabled
  const connections = await prisma.telegramConnection.findMany({
    where: { isActive: true, notifyAdvice: true },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          personalWallet: {
            select: {
              id: true,
              accounts: { select: { id: true } },
            },
          },
        },
      },
    },
  })

  const now = new Date()
  const isFirstOfMonth = now.getDate() === 1

  for (const conn of connections) {
    try {
      const wallet = conn.user.personalWallet
      if (!wallet) continue

      const accountIds = wallet.accounts.map(a => a.id)
      if (accountIds.length === 0) continue

      const triggers: string[] = []

      // 1. Budget > 80%
      const budgets = await prisma.budget.findMany({
        where: { walletId: wallet.id },
        include: { category: { select: { name: true } } },
      })

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      for (const budget of budgets) {
        const spent = await prisma.transaction.aggregate({
          where: {
            accountId: { in: accountIds },
            type: 'EXPENSE',
            categoryId: budget.categoryId,
            date: { gte: monthStart },
          },
          _sum: { amount: true },
        })
        const spentAmount = Number(spent._sum.amount ?? 0)
        const limit = Number(budget.amount)
        const pct = limit > 0 ? Math.round((spentAmount / limit) * 100) : 0
        if (pct >= 80) {
          triggers.push(`Бюджет "${budget.category.name}": ${pct}% использовано (${spentAmount.toLocaleString('ru-RU')} из ${limit.toLocaleString('ru-RU')} ₽)`)
        }
      }

      // 2. Category spending spike (+50% vs 4-week avg)
      const fourWeeksAgo = new Date()
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
      const eightWeeksAgo = new Date()
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

      const [recentSpend, prevSpend] = await Promise.all([
        prisma.transaction.groupBy({
          by: ['categoryId'],
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: fourWeeksAgo } },
          _sum: { amount: true },
        }),
        prisma.transaction.groupBy({
          by: ['categoryId'],
          where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: eightWeeksAgo, lt: fourWeeksAgo } },
          _sum: { amount: true },
        }),
      ])

      const prevMap = new Map(prevSpend.map(s => [s.categoryId, Number(s._sum.amount ?? 0)]))
      for (const s of recentSpend) {
        const prev = prevMap.get(s.categoryId) ?? 0
        const curr = Number(s._sum.amount ?? 0)
        if (prev > 0 && curr > prev * 1.5) {
          // Get category name
          const cat = s.categoryId ? await prisma.category.findUnique({ where: { id: s.categoryId }, select: { name: true } }) : null
          triggers.push(`Расходы на "${cat?.name ?? 'Другое'}" выросли на ${Math.round(((curr - prev) / prev) * 100)}% за последние 4 недели`)
        }
      }

      // 3. Goal stagnation (no deposits 2+ weeks)
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      const goals = await prisma.goal.findMany({
        where: { userId: conn.user.id, isCompleted: false },
      })
      for (const goal of goals) {
        if (goal.updatedAt < twoWeeksAgo) {
          triggers.push(`Цель "${goal.name}" не пополнялась более 2 недель`)
        }
      }

      // 4. Monthly summary on 1st
      if (isFirstOfMonth) {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        const monthTotals = await prisma.transaction.aggregate({
          where: {
            accountId: { in: accountIds },
            type: 'EXPENSE',
            date: { gte: lastMonthStart, lte: lastMonthEnd },
          },
          _sum: { amount: true },
          _count: true,
        })
        triggers.push(`Итог прошлого месяца: ${Number(monthTotals._sum.amount ?? 0).toLocaleString('ru-RU')} ₽ за ${monthTotals._count} операций`)
      }

      if (triggers.length === 0) continue

      // Generate advice via AI
      const adviceText = await callOpenRouter({
        model: 'anthropic/claude-haiku-4-5-20251001',
        systemPrompt: 'Ты финансовый советник. Пиши кратко, дружелюбно, на русском.',
        prompt: `На основе этих фактов дай 1-2 коротких совета пользователю ${conn.user.name ?? ''}:\n${triggers.join('\n')}`,
        maxTokens: 300,
      })

      if (!adviceText) continue

      // Send via Telegram
      const message = `💡 <b>Финансовый совет</b>\n\n${adviceText}`
      await sendTelegramMessage(conn.chatId, message)

      // Save notification
      await prisma.notification.create({
        data: {
          userId: conn.user.id,
          type: 'PROACTIVE_ADVICE',
          title: 'Финансовый совет',
          body: adviceText,
          data: { triggers },
        },
      })
    } catch (err) {
      console.error(`Proactive advice error for user ${conn.user.id}:`, err)
    }
  }
}
