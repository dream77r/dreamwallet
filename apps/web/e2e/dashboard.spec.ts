import { test, expect } from './fixtures'

test.describe('Dashboard', () => {
  test('дашборд загружается после логина', async ({ authedPage: page }) => {
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 })

    // Основной заголовок страницы
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('навигационное меню содержит основные разделы', async ({ authedPage: page }) => {
    // Sidebar/nav должен содержать ключевые ссылки
    const nav = page.locator('nav, aside, [role="navigation"]').first()
    await expect(nav).toBeVisible()

    await expect(page.locator('a[href*="/dashboard/transactions"]').first()).toBeVisible()
    await expect(page.locator('a[href*="/dashboard/accounts"]').first()).toBeVisible()
    await expect(page.locator('a[href*="/dashboard/budgets"]').first()).toBeVisible()
  })

  test('переход на страницу Транзакции', async ({ authedPage: page }) => {
    await page.click('a[href*="/dashboard/transactions"]')
    await expect(page).toHaveURL(/\/dashboard\/transactions/)
    await expect(page.locator('h1').first()).toContainText('Транзакции')
  })

  test('переход на страницу Счета', async ({ authedPage: page }) => {
    await page.click('a[href*="/dashboard/accounts"]')
    await expect(page).toHaveURL(/\/dashboard\/accounts/)
    await expect(page.locator('h1').first()).toContainText('Счета')
  })

  test('переход на страницу Бюджеты', async ({ authedPage: page }) => {
    await page.click('a[href*="/dashboard/budgets"]')
    await expect(page).toHaveURL(/\/dashboard\/budgets/)
    await expect(page.locator('h1').first()).toContainText('Бюджеты')
  })

  test('переход на страницу Проекты', async ({ authedPage: page }) => {
    await page.click('a[href*="/dashboard/projects"]')
    await expect(page).toHaveURL(/\/dashboard\/projects/)
    await expect(page.locator('h1').first()).toContainText('Проекты')
  })
})
