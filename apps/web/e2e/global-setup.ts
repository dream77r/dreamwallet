import { chromium, type Page, type FullConfig } from '@playwright/test'
import { TEST_USER } from './fixtures'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

async function trpcQuery(page: Page, baseURL: string, proc: string) {
  const input = encodeURIComponent(JSON.stringify({ '0': { json: null } }))
  const res = await page.request.get(`${baseURL}/api/trpc/${proc}?batch=1&input=${input}`)
  const data = await res.json() as Array<{ result?: { data?: { json?: unknown } } }>
  return data[0]?.result?.data?.json
}

async function trpcMutate(page: Page, baseURL: string, proc: string, input: unknown) {
  const res = await page.request.post(`${baseURL}/api/trpc/${proc}?batch=1`, {
    data: { '0': { json: input } },
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json() as Array<{ result?: { data?: { json?: unknown } } }>
  return data[0]?.result?.data?.json
}

export default async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  // 1. Регистрируем тест-юзера (если уже существует — ок, ошибку игнорируем)
  await page.request.post(`${baseURL}/api/auth/sign-up/email`, {
    data: { name: TEST_USER.name, email: TEST_USER.email, password: TEST_USER.password },
    headers: { 'Content-Type': 'application/json' },
  })

  // 2. Логинимся через UI (нужно для сохранения session cookie)
  await page.goto(`${baseURL}/login`)
  await page.fill('#email', TEST_USER.email)
  await page.fill('#password', TEST_USER.password)
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    console.log('[global-setup] Login successful')
  } catch {
    console.error('[global-setup] Login redirect failed')
    await browser.close()
    return
  }

  // 3. Получаем кошелёк (создаётся автоматически при регистрации)
  const wallet = await trpcQuery(page, baseURL, 'wallet.get') as { id?: string } | null
  if (!wallet?.id) {
    console.error('[global-setup] No wallet found for test user')
    await browser.close()
    return
  }
  console.log(`[global-setup] Wallet: ${wallet.id}`)

  // 4. Проверяем есть ли уже счета
  const accounts = await trpcQuery(page, baseURL, 'account.listAll') as Array<unknown> | null
  if (Array.isArray(accounts) && accounts.length > 0) {
    console.log(`[global-setup] Accounts exist: ${accounts.length}`)
  } else {
    // 5. Создаём тестовый счёт (нужен для теста создания транзакции)
    const account = await trpcMutate(page, baseURL, 'account.create', {
      walletId: wallet.id,
      name: 'Тестовый счёт',
      type: 'BANK_ACCOUNT',
      currency: 'RUB',
      initialBalance: 10000,
    }) as { id?: string } | null
    console.log(`[global-setup] Test account created: ${account?.id ?? 'error'}`)
  }

  // 6. Сохраняем auth state
  await context.storageState({ path: AUTH_FILE })
  console.log('[global-setup] Auth state saved')

  await browser.close()
}
