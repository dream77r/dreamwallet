import { test as base, type Page } from '@playwright/test'

export const TEST_USER = {
  name: 'Test User',
  email: process.env.TEST_USER_EMAIL || 'test-e2e@dreamwallet.test',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
}

/**
 * Логинимся или регистрируемся через UI (используется только в auth.spec.ts).
 * Для остальных тестов сессия загружается из storageState (global-setup).
 */
export async function loginViaUI(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')

  return page
    .waitForURL('**/dashboard', { timeout: 10_000 })
    .then(() => true)
    .catch(() => false)
}

/** Фикстура: page уже залогинена через storageState из global-setup */
type Fixtures = {
  authedPage: Page
}

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use) => {
    // storageState уже применён через playwright.config.ts (project: authenticated)
    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard', { timeout: 10_000 })
    await use(page)
  },
})

export { expect } from '@playwright/test'
