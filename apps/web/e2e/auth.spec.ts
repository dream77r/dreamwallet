import { test, expect } from '@playwright/test'
import { TEST_USER, loginViaUI } from './fixtures'

test.describe('Auth flows', () => {
  test('страница логина отображается', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText('Вход в DreamWallet')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('страница регистрации отображается', async ({ page }) => {
    await page.goto('/register')

    await expect(page.getByText('Создать аккаунт')).toBeVisible()
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('ссылка "Зарегистрироваться" ведёт на /register', async ({ page }) => {
    await page.goto('/login')
    await page.click('text=Зарегистрироваться')
    await expect(page).toHaveURL(/\/register/)
  })

  test('ссылка "Войти" ведёт на /login', async ({ page }) => {
    await page.goto('/register')
    await page.click('text=Войти')
    await expect(page).toHaveURL(/\/login/)
  })

  test('ошибка при неверных данных', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'nonexistent@example.com')
    await page.fill('#password', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Остаёмся на странице логина — нет редиректа
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('успешный вход → редирект на /dashboard', async ({ page }) => {
    // Регистрируем уникального пользователя
    const ts = Date.now()
    const email = `e2e-auth-${ts}@dreamwallet.test`
    const password = 'testpassword123'

    await page.goto('/register')
    await page.fill('#name', 'Auth Test User')
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 15_000 })

    // Логаутимся через переход на /login (без кнопки пока)
    // и логинимся снова
    await loginViaUI(page, email, password)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })

  test('неавторизованный юзер редиректится с /dashboard на /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })
})
