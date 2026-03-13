import { test, expect } from './fixtures'

test.describe('Forecast page', () => {
  test('страница прогноза загружается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/forecast')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1').first()).toContainText('Прогноз денежного потока')
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('переключатель дней присутствует', async ({ authedPage: page }) => {
    await page.goto('/dashboard/forecast')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('tab', { name: '30 дней' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '60 дней' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '90 дней' })).toBeVisible()
  })

  test('переключение периода работает', async ({ authedPage: page }) => {
    await page.goto('/dashboard/forecast')
    await page.waitForLoadState('networkidle')

    await page.getByRole('tab', { name: '60 дней' }).click()
    await expect(page.locator('body')).not.toContainText('Application error')

    await page.getByRole('tab', { name: '90 дней' }).click()
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('пустое состояние или прогноз отображается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/forecast')
    await page.waitForLoadState('networkidle')

    // Либо пустое состояние "Нет регулярных платежей", либо карточки прогноза
    const emptyState = page.getByText('Нет регулярных платежей')
    const forecastChart = page.getByText('Прогноз баланса')
    const summaryCard = page.getByText('Сейчас')

    const hasEmpty = await emptyState.isVisible().catch(() => false)
    const hasChart = await forecastChart.isVisible().catch(() => false)
    const hasSummary = await summaryCard.isVisible().catch(() => false)

    expect(hasEmpty || hasChart || hasSummary).toBeTruthy()
  })

  test('пустое состояние содержит ссылку на регулярные платежи', async ({ authedPage: page }) => {
    await page.goto('/dashboard/forecast')
    await page.waitForLoadState('networkidle')

    const emptyState = page.getByText('Нет регулярных платежей')
    const isEmpty = await emptyState.isVisible().catch(() => false)

    if (isEmpty) {
      // Кнопка ведёт на /dashboard/recurring
      const addButton = page.getByRole('link', { name: 'Добавить регулярный платёж' })
      await expect(addButton).toBeVisible()
    }
  })
})
