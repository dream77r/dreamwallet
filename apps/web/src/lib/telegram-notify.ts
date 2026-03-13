/**
 * Утилита отправки сообщений через Telegram Bot API.
 * Graceful degradation: при ошибке логирует, не бросает исключение.
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('[telegram-notify] TELEGRAM_BOT_TOKEN не задан, уведомление пропущено')
    return
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[telegram-notify] Ошибка отправки (${res.status}): ${body}`)
    }
  } catch (err) {
    console.error('[telegram-notify] Ошибка сети:', err)
  }
}

/** Форматирует сумму с разделителем тысяч */
export function formatAmount(amount: number, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
