import type { Processor } from 'bullmq'
import pino from 'pino'
import { prisma } from '@dreamwallet/db'

const logger = pino({ name: 'smart-rules' })

export const smartRulesProcessor: Processor = async () => {
  logger.info('Running weekly smart rules analysis...')

  try {
    // Get all users with uncategorized transactions
    const wallets = await prisma.wallet.findMany({
      where: { type: 'PERSONAL', userId: { not: null } },
      select: { userId: true, accounts: { select: { id: true } } },
    })

    for (const wallet of wallets) {
      if (!wallet.userId) continue
      const accountIds = wallet.accounts.map(a => a.id)

      // Find uncategorized transactions from last 3 months
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const uncategorized = await prisma.transaction.findMany({
        where: {
          accountId: { in: accountIds },
          categoryId: null,
          date: { gte: threeMonthsAgo },
          description: { not: null },
        },
        select: { description: true, counterparty: true, type: true },
        take: 200,
      })

      if (uncategorized.length < 5) continue

      // Group by description pattern (first word)
      const patterns = new Map<string, { count: number; type: string }>()
      for (const tx of uncategorized) {
        const desc = (tx.description ?? '').toLowerCase().trim()
        const firstWord = desc.split(/\s+/)[0]
        if (firstWord && firstWord.length >= 3) {
          const existing = patterns.get(firstWord)
          if (existing) {
            existing.count++
          } else {
            patterns.set(firstWord, { count: 1, type: tx.type })
          }
        }
      }

      // Get user's categories
      const categories = await prisma.category.findMany({
        where: { userId: wallet.userId },
        select: { id: true, name: true, type: true },
      })

      if (categories.length === 0) continue

      // Use AI to suggest categories for frequent patterns
      const apiKey = process.env.OPENROUTER_API_KEY
      if (!apiKey) continue

      const frequentPatterns = Array.from(patterns.entries())
        .filter(([, v]) => v.count >= 3)
        .slice(0, 10)

      if (frequentPatterns.length === 0) continue

      const catList = categories.map(c => `${c.name} (${c.type})`).join(', ')
      const patternList = frequentPatterns.map(([p, v]) => `"${p}" (${v.count}x, ${v.type})`).join('\n')

      const prompt = `Категоризируй часто встречающиеся описания транзакций.

Категории: ${catList}

Паттерны:
${patternList}

Ответь JSON массивом: [{"pattern":"слово","categoryName":"категория","confidence":0.0-1.0}]`

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
            max_tokens: 400,
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        if (!res.ok) continue

        const data = await res.json() as { choices: Array<{ message: { content: string } }> }
        const text = data.choices?.[0]?.message?.content ?? ''
        const match = text.match(/\[[\s\S]*\]/)
        if (!match) continue

        const suggestions = JSON.parse(match[0]) as Array<{ pattern: string; categoryName: string; confidence: number }>

        for (const s of suggestions) {
          if (s.confidence < 0.5) continue
          const cat = categories.find(c => c.name.toLowerCase() === s.categoryName.toLowerCase())
          if (!cat) continue

          const patternData = patterns.get(s.pattern)

          // Check if suggestion already exists
          const existing = await prisma.smartRuleSuggestion.findFirst({
            where: { userId: wallet.userId!, pattern: s.pattern, categoryId: cat.id },
          })
          if (existing) continue

          await prisma.smartRuleSuggestion.create({
            data: {
              userId: wallet.userId!,
              pattern: s.pattern,
              field: 'description',
              categoryId: cat.id,
              confidence: s.confidence,
              matchCount: patternData?.count ?? 0,
            },
          })
        }
      } catch (err) {
        logger.error({ userId: wallet.userId, error: err }, 'AI suggestion failed')
      }
    }

    logger.info('Smart rules analysis complete')
  } catch (err) {
    logger.error(err, 'Smart rules processor failed')
    throw err
  }
}
