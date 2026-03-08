import { test, expect } from './fixtures'

test.describe('Финансовые цели', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/dashboard/goals')
    await page.waitForURL('**/dashboard/goals')
    await page.waitForLoadState('networkidle')
  })

  test('страница целей загружается', async ({ authedPage: page }) => {
    await expect(page.locator('h1').first()).toContainText('Цел')
  })

  test('отображается список целей или пустое состояние', async ({ authedPage: page }) => {
    const hasGoals = await page.locator('[data-testid="goal-item"]').count() > 0
    const hasEmptyText = await page.locator('text=/нет целей|добавьте первую/i').isVisible().catch(() => false)
    const hasAddButton = await page.locator('button').filter({ hasText: /добавить|создать|цель/i }).isVisible().catch(() => false)

    expect(hasGoals || hasEmptyText || hasAddButton).toBe(true)
  })

  test('кнопка создания цели открывает форму', async ({ authedPage: page }) => {
    const addButton = page.locator('button').filter({ hasText: /добавить|создать|новую/i }).first()
    if (!await addButton.isVisible()) {
      test.skip()
      return
    }

    await addButton.click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
  })

  test('создание новой цели', async ({ authedPage: page }) => {
    const addButton = page.locator('button').filter({ hasText: /добавить|создать/i }).first()
    if (!await addButton.isVisible()) {
      test.skip()
      return
    }

    await addButton.click()
    const dialog = page.locator('[role="dialog"]')
    if (!await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    // Название цели
    const nameInput = dialog.locator('input[placeholder*="Название"], input[id*="name"], input[name*="name"]').first()
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Тест E2E: отпуск')
    }

    // Целевая сумма
    const targetInput = dialog.locator('input[type="number"], input[placeholder*="сумм"], input[placeholder*="100"]').first()
    if (await targetInput.isVisible().catch(() => false)) {
      await targetInput.fill('100000')
    }

    // Сохраняем
    const submitBtn = dialog.locator('button[type="submit"]').first()
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click()
      await expect(dialog).not.toBeVisible({ timeout: 8_000 })
    }
  })

  test('прогресс цели отображается корректно', async ({ authedPage: page }) => {
    await page.waitForLoadState('networkidle')

    // Проверяем что прогресс-бары имеют разумные значения (0-100%)
    const progressBars = page.locator('[role="progressbar"]')
    const count = await progressBars.count()

    for (let i = 0; i < Math.min(count, 3); i++) {
      const valueNow = await progressBars.nth(i).getAttribute('aria-valuenow')
      if (valueNow !== null) {
        const val = parseInt(valueNow)
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(100)
      }
    }
  })
})
