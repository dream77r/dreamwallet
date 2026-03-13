import { createHmac } from 'crypto'

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}

/**
 * Validate Telegram Web App initData using HMAC-SHA256.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData: string, botToken: string): TelegramUser | null {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  // Remove hash from params, sort alphabetically
  params.delete('hash')
  const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b))
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n')

  // HMAC-SHA256(HMAC-SHA256("WebAppData", botToken), dataCheckString)
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (computedHash !== hash) return null

  const userStr = params.get('user')
  if (!userStr) return null

  try {
    return JSON.parse(userStr) as TelegramUser
  } catch {
    return null
  }
}
