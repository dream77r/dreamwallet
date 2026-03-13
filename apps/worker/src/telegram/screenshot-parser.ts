/**
 * Парсер скриншотов банковских приложений через OpenRouter vision API
 */
import pino from 'pino'

const logger = pino({ name: 'screenshot-parser' })

export interface ParsedScreenshot {
  amount: number
  type: 'INCOME' | 'EXPENSE'
  description: string
  date?: string
  category?: string
}

export async function parseScreenshot(base64: string): Promise<ParsedScreenshot | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    logger.warn('OPENROUTER_API_KEY not set, cannot parse screenshots')
    return null
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://dreamwallet.app',
        'X-Title': 'DreamWallet',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Это скриншот банковского приложения или чека. Распознай транзакцию.
Ответь ТОЛЬКО JSON без markdown:
{"amount": число, "type": "INCOME" или "EXPENSE", "description": "описание/получатель", "date": "YYYY-MM-DD", "category": "категория на русском"}
Если это не финансовый документ, ответь null.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        }],
      }),
    })

    if (!res.ok) {
      logger.error({ status: res.status }, 'OpenRouter vision error')
      return null
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> }
    const text = data.choices?.[0]?.message?.content ?? ''

    if (text.includes('null')) return null

    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null

    const parsed = JSON.parse(match[0])
    if (!parsed.amount || parsed.amount <= 0) return null

    return {
      amount: Number(parsed.amount),
      type: parsed.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
      description: String(parsed.description ?? 'Скриншот'),
      date: parsed.date,
      category: parsed.category,
    }
  } catch (err) {
    logger.error(err, 'Failed to parse screenshot')
    return null
  }
}
