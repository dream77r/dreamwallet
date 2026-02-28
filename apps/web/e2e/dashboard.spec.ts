import { test, expect } from './fixtures'

test.describe('Dashboard', () => {
  test('дашборд загружается после логина', async ({ authedPage: page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    // Заголовок "Обзор" на главной странице дашборда
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('навигационное меню содержит основные разделы', async ({ authedPage: page }) => {
    // Ссылки в сайдбаре
    await expect(page.getByRole('link', { name: 'Транзакции' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Счета' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Бюджеты' })).toBeVisible()
  })

  test('переход на страницу Транзакции', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Транзакции' }).click()
    await expect(page).toHaveURL(/\/dashboard\/transactions/)
    await expect(page.locator('h1').first()).toContainText('Транзакции')
  })

  test('переход на страницу Счета', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Счета' }).click()
    await expect(page).toHaveURL(/\/dashboard\/accounts/)
    await expect(page.locator('h1').first()).toContainText('Счета')
  })

  test('переход на страницу Бюджеты', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Бюджеты' }).click()
    await expect(page).toHaveURL(/\/dashboard\/budgets/)
    await expect(page.locator('h1').first()).toContainText('Бюджеты')
  })

  test('переход на страницу Проекты', async ({ authedPage: page }) => {
    await page.getByRole('link', { name: 'Проекты' }).click()
    await expect(page).toHaveURL(/\/dashboard\/projects/)
    await expect(page.locator('h1').first()).toContainText('Проекты')
  })
})
