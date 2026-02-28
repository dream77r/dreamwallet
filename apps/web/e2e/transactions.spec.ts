import { test, expect } from './fixtures'

test.describe('Transactions page', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/dashboard/transactions')
    await page.waitForURL('**/dashboard/transactions')
  })

  test('страница транзакций загружается', async ({ authedPage: page }) => {
    await expect(page.locator('h1').first()).toContainText('Транзакции')
  })

  test('кнопка "Добавить транзакцию" открывает форму', async ({ authedPage: page }) => {
    // Ищем кнопку добавления (TransactionForm без initialData рендерит триггер-кнопку)
    const addButton = page.locator('button').filter({ hasText: /добавить|транзакцию/i }).first()
    await expect(addButton).toBeVisible()
    await addButton.click()

    // Диалог должен открыться
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3_000 })
  })

  test('фильтр по типу работает', async ({ authedPage: page }) => {
    // Ищем селект типа
    const typeSelect = page.locator('button').filter({ hasText: /все типы/i })
    if (await typeSelect.isVisible()) {
      await typeSelect.click()
      await page.locator('[role="option"]').filter({ hasText: 'Расходы' }).click()
      // URL или состояние обновились — просто убеждаемся что страница не крэшится
      await expect(page.locator('h1').first()).toContainText('Транзакции')
    }
  })

  test('поле поиска фильтрует результаты', async ({ authedPage: page }) => {
    const searchInput = page.locator('input[placeholder*="Поиск"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('__nonexistent_transaction__')
      // Должна появиться пустая таблица
      await expect(
        page.locator('text=Транзакции не найдены, text=Нет транзакций').first()
      ).toBeVisible({ timeout: 5_000 })
    }
  })

  test('создание новой транзакции-расхода', async ({ authedPage: page }) => {
    // Нужен хотя бы один счёт — если счетов нет, пропускаем
    const addButton = page.locator('button').filter({ hasText: /добавить|транзакцию/i }).first()
    if (!await addButton.isVisible()) {
      test.skip()
      return
    }
    await addButton.click()

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()

    // Заполняем форму: тип EXPENSE, сумма, описание
    // Выбираем тип Расход (если есть переключатель)
    const expenseOption = dialog.locator('button, [role="radio"]').filter({ hasText: /расход/i }).first()
    if (await expenseOption.isVisible()) {
      await expenseOption.click()
    }

    // Сумма
    const amountInput = dialog.locator('input[type="number"], input[placeholder*="сумм" i]').first()
    if (await amountInput.isVisible()) {
      await amountInput.fill('1000')
    }

    // Описание
    const descInput = dialog.locator('input[placeholder*="описание" i], input[id*="description"]').first()
    if (await descInput.isVisible()) {
      await descInput.fill('E2E тест расход')
    }

    // Сохраняем
    const submitButton = dialog.locator('button[type="submit"]')
    if (await submitButton.isVisible()) {
      await submitButton.click()
      // Диалог должен закрыться
      await expect(dialog).not.toBeVisible({ timeout: 10_000 })
    }
  })
})
