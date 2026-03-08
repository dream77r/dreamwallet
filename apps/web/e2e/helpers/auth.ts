import { type Page, type BrowserContext } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

export const AUTH_FILE = path.join(__dirname, '../.auth/user.json')

/**
 * Логинимся через UI и возвращаем успех/неудачу.
 * Используется в auth.spec.ts для явного тестирования процесса входа.
 */
export async function loginAs(page: Page, email: string, password: string): Promise<boolean> {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')

  return page
    .waitForURL('**/dashboard', { timeout: 10_000 })
    .then(() => true)
    .catch(() => false)
}

/**
 * Регистрация + логин нового пользователя через UI.
 * Используется в тестах, которым нужен чистый аккаунт.
 */
export async function registerAndLogin(
  page: Page,
  opts: { name?: string; email?: string; password?: string } = {}
): Promise<{ email: string; password: string }> {
  const ts = Date.now()
  const email = opts.email ?? `e2e-${ts}@dreamwallet.test`
  const password = opts.password ?? 'testpassword123'
  const name = opts.name ?? 'E2E User'

  await page.goto('/register')
  await page.fill('#name', name)
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 15_000 })

  return { email, password }
}

/**
 * Проверяет, сохранён ли auth state.
 */
export function hasStoredAuthState(): boolean {
  return fs.existsSync(AUTH_FILE)
}

/**
 * Применяет сохранённый auth state к контексту.
 * Позволяет переиспользовать сессию между тестами без повторного логина.
 */
export async function applyStoredAuth(context: BrowserContext): Promise<void> {
  if (hasStoredAuthState()) {
    await context.storageState()
  }
}
