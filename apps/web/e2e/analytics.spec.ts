import { test, expect } from './fixtures'

test.describe('Analytics page', () => {
  test('страница аналитики загружается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/analytics')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1').first()).toContainText('Аналитика')
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('табы Графики / Отчёт переключаются', async ({ authedPage: page }) => {
    await page.goto('/dashboard/analytics')
    await page.waitForLoadState('networkidle')

    // По умолчанию выбран таб "Графики"
    const graphicsTab = page.getByRole('tab', { name: 'Графики' })
    const reportTab = page.getByRole('tab', { name: 'Отчёт' })

    await expect(graphicsTab).toBeVisible()
    await expect(reportTab).toBeVisible()

    // Переключаемся на Отчёт
    await reportTab.click()
    await expect(page.getByText('Распечатать / PDF')).toBeVisible({ timeout: 5_000 })

    // Возвращаемся на Графики
    await graphicsTab.click()
  })

  test('переключатель периодов присутствует', async ({ authedPage: page }) => {
    await page.goto('/dashboard/analytics')
    await page.waitForLoadState('networkidle')

    // Период-табы: Этот месяц, 3 месяца, 6 месяцев, Год
    await expect(page.getByRole('tab', { name: 'Этот месяц' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '3 месяца' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '6 месяцев' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Год' })).toBeVisible()
  })

  test('переключение периода работает', async ({ authedPage: page }) => {
    await page.goto('/dashboard/analytics')
    await page.waitForLoadState('networkidle')

    // Кликаем на "Год"
    await page.getByRole('tab', { name: 'Год' }).click()

    // Кликаем обратно на "3 месяца"
    await page.getByRole('tab', { name: '3 месяца' }).click()

    // Страница не упала
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('KPI карточки отображаются', async ({ authedPage: page }) => {
    await page.goto('/dashboard/analytics')
    await page.waitForLoadState('networkidle')

    // Карточки KPI: Доходы, Расходы, Накоплено, Норма сбережений
    await expect(page.getByText('Доходы').first()).toBeVisible()
    await expect(page.getByText('Расходы').first()).toBeVisible()
    await expect(page.getByText('Накоплено').first()).toBeVisible()
    await expect(page.getByText('Норма сбережений')).toBeVisible()
  })

  test('графики или пустое состояние отображаются', async ({ authedPage: page }) => {
    await page.goto('/dashboard/analytics')
    await page.waitForLoadState('networkidle')

    // Заголовок графика "Доходы и расходы" или пустое "Нет данных"
    const chartTitle = page.getByText('Доходы и расходы')
    const noData = page.getByText('Нет данных за выбранный период')

    // Одно из двух должно быть видно
    const hasChart = await chartTitle.isVisible().catch(() => false)
    const hasEmpty = await noData.first().isVisible().catch(() => false)
    expect(hasChart || hasEmpty).toBeTruthy()
  })
})
