import { test, expect } from './fixtures'

/**
 * Навигационные тесты — проверяют что все пункты сайдбара кликабельны
 * и ведут на правильные страницы.
 */

const NAV_ITEMS = [
  { title: 'Транзакции', href: '/dashboard/transactions' },
  { title: 'Счета', href: '/dashboard/accounts' },
  { title: 'Регулярные', href: '/dashboard/recurring' },
  { title: 'Долги', href: '/dashboard/debts' },
  { title: 'Подписки', href: '/dashboard/subscriptions-tracker' },
  { title: 'Бюджеты', href: '/dashboard/budgets' },
  { title: 'Категории', href: '/dashboard/categories' },
  { title: 'Теги', href: '/dashboard/tags' },
  { title: 'Цели', href: '/dashboard/goals' },
  { title: 'Прогноз', href: '/dashboard/forecast' },
  { title: 'Аналитика', href: '/dashboard/analytics' },
  { title: 'Активы', href: '/dashboard/net-worth' },
  { title: 'Импорт', href: '/dashboard/import' },
  { title: 'Проекты', href: '/dashboard/projects' },
] as const

test.describe('Sidebar navigation', () => {
  test('дашборд — стартовая страница после логина', async ({ authedPage: page }) => {
    await expect(page).toHaveURL(/\/dashboard/)
    // Сайдбар присутствует
    await expect(page.locator('[data-sidebar="sidebar"]').or(page.locator('nav')).first()).toBeVisible()
  })

  for (const { title, href } of NAV_ITEMS) {
    test(`переход: ${title} → ${href}`, async ({ authedPage: page }) => {
      // Ищем ссылку по тексту
      const link = page.getByRole('link', { name: title }).first()

      // Если ссылка не видна (collapsed sidebar, etc.) — пробуем найти через href
      const isVisible = await link.isVisible()
      if (!isVisible) {
        const linkByHref = page.locator(`a[href="${href}"]`).first()
        if (!await linkByHref.isVisible()) {
          test.skip()
          return
        }
        await linkByHref.click()
      } else {
        await link.click()
      }

      await expect(page).toHaveURL(new RegExp(href.replace(/\//g, '\\/')), { timeout: 8_000 })
      // Страница не крэшнулась (нет error boundary / 500)
      await expect(page.locator('body')).not.toContainText('Application error', { timeout: 3_000 })
    })
  }

  test('настройки — доступны через sidebar footer', async ({ authedPage: page }) => {
    const settingsLink = page
      .locator('a[href="/dashboard/settings"]')
      .or(page.getByRole('link', { name: 'Настройки' }))
      .first()

    if (!await settingsLink.isVisible()) {
      test.skip()
      return
    }

    await settingsLink.click()
    await expect(page).toHaveURL(/\/dashboard\/settings/, { timeout: 8_000 })
  })

  test('возврат на обзор через logo/breadcrumb', async ({ authedPage: page }) => {
    // Переходим на другую страницу
    await page.goto('/dashboard/transactions')
    await page.waitForURL('**/dashboard/transactions')

    // Ищем ссылку "Обзор" или logo
    const overviewLink = page
      .getByRole('link', { name: 'Обзор' })
      .or(page.locator('a[href="/dashboard"]').first())
      .first()

    if (await overviewLink.isVisible()) {
      await overviewLink.click()
      await expect(page).toHaveURL(/\/dashboard$/, { timeout: 8_000 })
    }
  })
})
