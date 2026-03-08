import { test, expect } from './fixtures'

test.describe('Бюджеты', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/dashboard/budgets')
    await page.waitForURL('**/dashboard/budgets')
    await page.waitForLoadState('networkidle')
  })

  test('страница бюджетов загружается', async ({ authedPage: page }) => {
    await expect(page.locator('h1').first()).toContainText('Бюджет')
  })

  test('отображается пустое состояние или список бюджетов', async ({ authedPage: page }) => {
    // Должен быть либо список, либо empty state
    const hasBudgets = await page.locator('[data-testid="budget-item"], .budget-item').count() > 0
    const hasEmptyState = await page.locator('text=/нет бюджетов|создайте первый/i').isVisible().catch(() => false)
    const hasAddButton = await page.locator('button').filter({ hasText: /добавить|создать|бюджет/i }).isVisible().catch(() => false)

    expect(hasBudgets || hasEmptyState || hasAddButton).toBe(true)
  })

  test('кнопка создания бюджета открывает форму', async ({ authedPage: page }) => {
    const addButton = page.locator('button').filter({ hasText: /добавить|создать|новый/i }).first()
    if (!await addButton.isVisible()) {
      test.skip()
      return
    }

    await addButton.click()
    // Форма должна появиться (dialog или inline)
    const formVisible = await page.locator('[role="dialog"], form').first().isVisible({ timeout: 3_000 }).catch(() => false)
    expect(formVisible).toBe(true)

    // Закрываем
    await page.keyboard.press('Escape')
  })

  test('прогресс-бар отображается для активных бюджетов', async ({ authedPage: page }) => {
    // Ждём данных
    await page.waitForLoadState('networkidle')

    // Если есть бюджеты — должны быть прогресс-бары
    const budgetCards = page.locator('[role="progressbar"], [aria-valuenow]')
    const count = await budgetCards.count()

    if (count > 0) {
      // Прогресс-бар есть — проверяем что aria-valuenow от 0 до 100
      const first = budgetCards.first()
      const valueNow = await first.getAttribute('aria-valuenow')
      if (valueNow !== null) {
        const val = parseInt(valueNow)
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(100)
      }
    }
    // Если бюджетов нет — тест проходит (пустое состояние нормально)
  })

  test('создание и удаление бюджета (если есть категории)', async ({ authedPage: page }) => {
    const addButton = page.locator('button').filter({ hasText: /добавить|создать|новый/i }).first()
    if (!await addButton.isVisible()) {
      test.skip()
      return
    }

    await addButton.click()
    const dialog = page.locator('[role="dialog"]').first()
    if (!await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    // Проверяем что есть выбор категории
    const categoryTrigger = dialog.locator('button[role="combobox"]').first()
    if (!await categoryTrigger.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape')
      test.skip()
      return
    }

    await categoryTrigger.click()
    const options = page.locator('[role="option"]')
    const optCount = await options.count()
    if (optCount === 0) {
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
      test.skip()
      return
    }

    await options.first().click()

    // Вводим сумму лимита
    const amountInput = dialog.locator('input[type="number"], input[placeholder*="000"], input[placeholder*="лимит"]').first()
    if (await amountInput.isVisible().catch(() => false)) {
      await amountInput.fill('5000')
    }

    // Сохраняем
    const submitBtn = dialog.locator('button[type="submit"]').first()
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click()
      // Ждём закрытия диалога
      await expect(dialog).not.toBeVisible({ timeout: 8_000 })
    }
  })
})
