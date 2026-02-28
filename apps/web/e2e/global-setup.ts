import { chromium, type FullConfig } from '@playwright/test'
import { TEST_USER } from './fixtures'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

export default async function globalSetup(_config: FullConfig) {
  // Убеждаемся что директория существует
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage()

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

  // Сначала пробуем зарегистрировать (если уже существует — ок)
  const registerRes = await page.request.post(`${baseURL}/api/auth/sign-up/email`, {
    data: {
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
    headers: { 'Content-Type': 'application/json' },
  })

  // Если регистрация провалилась — пробуем залогиниться (юзер уже существует)
  if (!registerRes.ok()) {
    const loginRes = await page.request.post(`${baseURL}/api/auth/sign-in/email`, {
      data: { email: TEST_USER.email, password: TEST_USER.password },
      headers: { 'Content-Type': 'application/json' },
    })
    if (!loginRes.ok()) {
      console.error('[global-setup] Failed to register or login test user', await loginRes.text())
    }
  }

  // Логинимся через UI чтобы сохранить куки сессии
  await page.goto(`${baseURL}/login`)
  await page.fill('#email', TEST_USER.email)
  await page.fill('#password', TEST_USER.password)
  await page.click('button[type="submit"]')

  try {
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
  } catch {
    console.error('[global-setup] Login redirect failed — check server logs')
  }

  // Сохраняем состояние (куки, localStorage)
  await page.context().storageState({ path: AUTH_FILE })
  await browser.close()

  console.log('[global-setup] Test user auth state saved to', AUTH_FILE)
}
