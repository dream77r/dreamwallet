import { test as base, type Page } from '@playwright/test'

export const TEST_USER = {
  name: 'Test User',
  email: process.env.TEST_USER_EMAIL || 'test-e2e@dreamwallet.test',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
}

/**
 * Логинимся или регистрируемся через UI.
 * Возвращает page уже на /dashboard.
 */
export async function loginOrRegister(page: Page): Promise<void> {
  await page.goto('/login')

  // Заполняем форму логина
  await page.fill('#email', TEST_USER.email)
  await page.fill('#password', TEST_USER.password)
  await page.click('button[type="submit"]')

  // Если редирект на /dashboard — готово
  // Если нет (неверные данные) — пробуем регистрацию
  const isOnDashboard = await page
    .waitForURL('**/dashboard', { timeout: 5_000 })
    .then(() => true)
    .catch(() => false)

  if (!isOnDashboard) {
    await page.goto('/register')
    await page.fill('#name', TEST_USER.name)
    await page.fill('#email', TEST_USER.email)
    await page.fill('#password', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 10_000 })
  }
}

/** Расширенная фикстура с автологином */
type Fixtures = {
  authedPage: Page
}

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use) => {
    await loginOrRegister(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'
