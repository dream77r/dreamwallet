import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

// Simple Claude API call without SDK (keeps bundle small)
async function callClaude(prompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) return ''

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) return ''
  const data = await res.json()
  return (data.content?.[0]?.text ?? '') as string
}

export const insightsRouter = router({
  // Generate AI spending insights for the current month
  generate: protectedProcedure
    .input(z.object({ period: z.enum(['1m', '3m']).default('1m') }))
    .query(async ({ ctx, input }) => {
      const months = input.period === '3m' ? 3 : 1
      const now = new Date()
      const dateFrom = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
      const prevFrom = new Date(now.getFullYear(), now.getMonth() - months * 2 + 1, 1)
      const prevTo = new Date(now.getFullYear(), now.getMonth() - months + 1, 0)

      const wallet = await ctx.prisma.wallet.findFirst({
        where: { userId: ctx.user.id },
        include: { accounts: { select: { id: true, currency: true } } },
      })
      if (!wallet) return { insights: [], raw: '' }

      const accountIds = wallet.accounts.map(a => a.id)
      const currency = wallet.accounts[0]?.currency ?? 'RUB'

      // Current period spending by category
      const current = await ctx.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: dateFrom } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      })

      // Previous period for comparison
      const prev = await ctx.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: prevFrom, lte: prevTo } },
        _sum: { amount: true },
      })

      // Totals
      const totalIncome = await ctx.prisma.transaction.aggregate({
        where: { accountId: { in: accountIds }, type: 'INCOME', date: { gte: dateFrom } },
        _sum: { amount: true },
      })
      const totalExpense = await ctx.prisma.transaction.aggregate({
        where: { accountId: { in: accountIds }, type: 'EXPENSE', date: { gte: dateFrom } },
        _sum: { amount: true },
      })

      // Load category names
      const catIds = current.map(c => c.categoryId).filter(Boolean) as string[]
      const categories = await ctx.prisma.category.findMany({
        where: { id: { in: catIds } },
        select: { id: true, name: true },
      })
      const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))
      const prevMap = Object.fromEntries(prev.map(p => [p.categoryId, Number(p._sum.amount ?? 0)]))

      const income = Number(totalIncome._sum.amount ?? 0)
      const expense = Number(totalExpense._sum.amount ?? 0)
      const savings = income - expense
      const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0

      const categoryLines = current.map(c => {
        const name = catMap[c.categoryId ?? ''] ?? 'Прочее'
        const amount = Number(c._sum.amount ?? 0)
        const prevAmount = prevMap[c.categoryId ?? ''] ?? 0
        const delta = prevAmount > 0 ? Math.round(((amount - prevAmount) / prevAmount) * 100) : null
        return `${name}: ${amount.toLocaleString('ru')} ${currency}${delta !== null ? ` (${delta > 0 ? '+' : ''}${delta}% vs пред. период)` : ''}`
      }).join('\n')

      const prompt = `Ты персональный финансовый советник. Проанализируй данные за ${months === 1 ? 'месяц' : '3 месяца'} и дай 3-4 конкретных коротких инсайта на русском языке. Без воды, только факты и рекомендации.

Данные:
- Доходы: ${income.toLocaleString('ru')} ${currency}
- Расходы: ${expense.toLocaleString('ru')} ${currency}
- Накоплено: ${savings.toLocaleString('ru')} ${currency} (${savingsRate}%)

Расходы по категориям:
${categoryLines}

Ответь ТОЛЬКО JSON-массивом без markdown, вот так:
[{"emoji":"💡","title":"Короткий заголовок","text":"Один конкретный вывод или совет (1-2 предложения)"}]`

      const raw = await callClaude(prompt)

      let insights: Array<{ emoji: string; title: string; text: string }> = []
      if (raw) {
        try {
          // Extract JSON from response
          const match = raw.match(/\[[\s\S]*\]/)
          if (match) insights = JSON.parse(match[0])
        } catch {
          // If parsing fails, generate basic insights without AI
        }
      }

      // Fallback: rule-based insights if no API key or parsing failed
      if (!insights.length) {
        if (savingsRate < 0) {
          insights.push({ emoji: '⚠️', title: 'Расходы превышают доходы', text: `Дефицит ${Math.abs(savings).toLocaleString('ru')} ${currency}. Пора пересмотреть бюджет.` })
        } else if (savingsRate < 10) {
          insights.push({ emoji: '📊', title: 'Низкая норма сбережений', text: `Сохраняется лишь ${savingsRate}% дохода. Рекомендуется минимум 20%.` })
        } else {
          insights.push({ emoji: '✅', title: 'Хорошая норма сбережений', text: `Сохраняется ${savingsRate}% дохода — это выше рекомендуемого минимума.` })
        }

        const topCat = current[0]
        if (topCat) {
          const name = catMap[topCat.categoryId ?? ''] ?? 'Прочее'
          const amount = Number(topCat._sum.amount ?? 0)
          const pct = expense > 0 ? Math.round((amount / expense) * 100) : 0
          insights.push({ emoji: '🔍', title: `Главная статья: ${name}`, text: `${pct}% всех расходов — ${amount.toLocaleString('ru')} ${currency}.` })
        }
      }

      return { insights, period: input.period }
    }),
})
