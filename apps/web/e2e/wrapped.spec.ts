import { test, expect } from './fixtures'

test.describe('Wrapped page', () => {
  test('страница финансового итога загружается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/wrapped')
    await page.waitForLoadState('networkidle')

    // Страница не упала
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('переключатель Месяц / Год присутствует', async ({ authedPage: page }) => {
    await page.goto('/dashboard/wrapped')
    await page.waitForLoadState('networkidle')

    const monthButton = page.getByRole('button', { name: 'Месяц' })
    const yearButton = page.getByRole('button', { name: 'Год' })

    await expect(monthButton).toBeVisible()
    await expect(yearButton).toBeVisible()
  })

  test('переключение на Год работает', async ({ authedPage: page }) => {
    await page.goto('/dashboard/wrapped')
    await page.waitForLoadState('networkidle')

    const yearButton = page.getByRole('button', { name: 'Год' })
    await yearButton.click()

    // Страница не упала
    await expect(page.locator('body')).not.toContainText('Application error')

    // Переключаемся обратно
    const monthButton = page.getByRole('button', { name: 'Месяц' })
    await monthButton.click()
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('слайды или пустое состояние отображаются', async ({ authedPage: page }) => {
    await page.goto('/dashboard/wrapped')
    await page.waitForLoadState('networkidle')

    // Ждём загрузки данных
    await page.waitForTimeout(2000)

    // Пустое состояние или слайд с данными
    const emptyState = page.getByText('Нет данных за выбранный период')
    const slideTitle = page.getByText('Ваш финансовый итог')

    const hasEmpty = await emptyState.isVisible().catch(() => false)
    const hasSlide = await slideTitle.isVisible().catch(() => false)

    expect(hasEmpty || hasSlide).toBeTruthy()
  })

  test('точечные индикаторы видны при наличии данных', async ({ authedPage: page }) => {
    await page.goto('/dashboard/wrapped')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(2000)

    const emptyState = page.getByText('Нет данных за выбранный период')
    const isEmpty = await emptyState.isVisible().catch(() => false)

    if (!isEmpty) {
      // Dot indicators — 8 кнопок-точек
      const dots = page.locator('button.rounded-full.w-2\\.5.h-2\\.5')
      const dotCount = await dots.count()
      expect(dotCount).toBeGreaterThan(0)

      // Счётчик слайдов "1 / 8"
      await expect(page.getByText('1 / 8')).toBeVisible()
    }
  })

  test('навигация по слайдам работает', async ({ authedPage: page }) => {
    await page.goto('/dashboard/wrapped')
    await page.waitForLoadState('networkidle')

    await page.waitForTimeout(2000)

    const emptyState = page.getByText('Нет данных за выбранный период')
    const isEmpty = await emptyState.isVisible().catch(() => false)

    if (!isEmpty) {
      // Кликаем кнопку "вперёд" (ChevronRight)
      const nextButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first()
      const hasNext = await nextButton.isVisible().catch(() => false)

      if (hasNext) {
        await nextButton.click()
        // Счётчик должен показать "2 / 8"
        await expect(page.getByText('2 / 8')).toBeVisible({ timeout: 3_000 })
      }
    }
  })
})
