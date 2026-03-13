import { test, expect } from './fixtures'

test.describe('Achievements page', () => {
  test('страница достижений загружается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/achievements')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1').first()).toContainText('Достижения')
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('статистические карточки отображаются', async ({ authedPage: page }) => {
    await page.goto('/dashboard/achievements')
    await page.waitForLoadState('networkidle')

    // Стрик дней, Уровень, Очки, Бейджей
    await expect(page.getByText('Стрик дней')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Уровень')).toBeVisible()
    await expect(page.getByText('Очки')).toBeVisible()
    await expect(page.getByText('Бейджей')).toBeVisible()
  })

  test('секция бейджей отображается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/achievements')
    await page.waitForLoadState('networkidle')

    // Заголовок "Бейджи"
    await expect(page.getByText('Бейджи').first()).toBeVisible({ timeout: 10_000 })

    // Либо сетка бейджей, либо пустое состояние "Пока нет достижений"
    const emptyState = page.getByText('Пока нет достижений')
    const badgeCards = page.locator('.rounded-3xl .text-3xl') // emoji в карточках бейджей

    const hasEmpty = await emptyState.isVisible().catch(() => false)
    const hasBadges = (await badgeCards.count()) > 0

    expect(hasEmpty || hasBadges).toBeTruthy()
  })

  test('кнопка "Проверить" присутствует', async ({ authedPage: page }) => {
    await page.goto('/dashboard/achievements')
    await page.waitForLoadState('networkidle')

    const checkButton = page.getByRole('button', { name: 'Проверить' })
    await expect(checkButton).toBeVisible()
  })

  test('секция челленджей отображается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/achievements')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Челленджи').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Доступные челленджи')).toBeVisible()
  })
})
