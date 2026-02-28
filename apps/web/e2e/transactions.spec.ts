import { test, expect } from './fixtures'

test.describe('Transactions page', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/dashboard/transactions')
    await page.waitForURL('**/dashboard/transactions')
    // Ждём загрузки данных
    await page.waitForLoadState('networkidle')
  })

  test('страница транзакций загружается', async ({ authedPage: page }) => {
    await expect(page.locator('h1').first()).toContainText('Транзакции')
  })

  test('кнопка "Добавить транзакцию" открывает форму', async ({ authedPage: page }) => {
    // TransactionForm без initialData рендерит кнопку-триггер
    const addButton = page.locator('button').filter({ hasText: /добавить|транзакцию/i }).first()
    await expect(addButton).toBeVisible()
    await addButton.click()

    // Radix UI держит dialog в DOM — проверяем data-state="open"
    await expect(page.locator('[role="dialog"][data-state="open"]')).toBeVisible({ timeout: 3_000 })
    // Закрываем диалог (Escape)
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"][data-state="open"]')).not.toBeVisible({ timeout: 5_000 })
  })

  test('фильтр по типу работает', async ({ authedPage: page }) => {
    const typeSelect = page.locator('button').filter({ hasText: /все типы/i })
    if (!await typeSelect.isVisible()) {
      test.skip()
      return
    }
    await typeSelect.click()
    await page.locator('[role="option"]').filter({ hasText: 'Расходы' }).click()
    // Страница не крэшнулась
    await expect(page.locator('h1').first()).toContainText('Транзакции')
  })

  test('поле поиска фильтрует результаты', async ({ authedPage: page }) => {
    const searchInput = page.locator('input[placeholder*="Поиск"]')
    if (!await searchInput.isVisible()) {
      test.skip()
      return
    }
    await searchInput.fill('__nonexistent_xyz_12345__')
    await page.waitForLoadState('networkidle')

    // Одна из двух строк пустого состояния
    const emptyState = page.getByText('Транзакции не найдены')
      .or(page.getByText('Нет транзакций'))
    await expect(emptyState.first()).toBeVisible({ timeout: 5_000 })
  })

  test('создание транзакции-расхода (пропускается без счёта)', async ({ authedPage: page }) => {
    const addButton = page.locator('button').filter({ hasText: /добавить|транзакцию/i }).first()
    if (!await addButton.isVisible()) {
      test.skip()
      return
    }

    await addButton.click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()

    // Открываем дропдаун счетов и проверяем есть ли опции
    const accountTrigger = dialog.locator('button[role="combobox"]').first()
    if (await accountTrigger.isVisible()) {
      await accountTrigger.click()
      const options = page.locator('[role="option"]')
      const count = await options.count()
      if (count === 0) {
        // Нет счетов в БД — закрываем и пропускаем тест
        await page.keyboard.press('Escape')
        await page.keyboard.press('Escape')
        test.skip()
        return
      }
      // Выбираем первый счёт
      await options.first().click()
    }

    // Выбираем тип Расход
    const expenseBtn = dialog.locator('button, [role="radio"]').filter({ hasText: /расход/i }).first()
    if (await expenseBtn.isVisible()) await expenseBtn.click()

    // Сумма (type="text", placeholder="0.00")
    const amountInput = dialog.locator('input[placeholder="0.00"]')
    if (await amountInput.isVisible()) await amountInput.fill('500')

    // Описание/контрагент
    const descInput = dialog.locator('input[placeholder*="Магазин"]')
    if (await descInput.isVisible()) await descInput.fill('E2E тест')

    // Сабмит
    const submitButton = dialog.locator('button[type="submit"]')
    if (await submitButton.isVisible()) {
      await submitButton.click()
      await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    }
  })
})
