import { test, expect } from './fixtures'

test.describe('Settings page', () => {
  test('страница настроек загружается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1').first()).toContainText('Настройки')
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('секция профиля отображается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')

    // Заголовок секции "Профиль"
    await expect(page.getByText('Профиль').first()).toBeVisible()
    await expect(page.getByText('Ваши личные данные')).toBeVisible()

    // Поля ввода
    await expect(page.locator('#name')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#email')).toBeVisible()
  })

  test('секция региональных настроек отображается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Региональные настройки')).toBeVisible()
    await expect(page.getByText('Основная валюта')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Часовой пояс')).toBeVisible()
  })

  test('секция безопасности отображается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Безопасность').first()).toBeVisible()
    await expect(page.getByText('Изменить пароль')).toBeVisible()
    await expect(page.getByText('Двухфакторная аутентификация')).toBeVisible()
  })

  test('секция подписки отображается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Подписка').first()).toBeVisible()
    await expect(page.getByText('Ваш текущий тариф')).toBeVisible()
  })

  test('кнопка сохранения профиля присутствует', async ({ authedPage: page }) => {
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')

    const saveButton = page.getByRole('button', { name: 'Сохранить' }).first()
    await expect(saveButton).toBeVisible({ timeout: 10_000 })
  })

  test('опасная зона отображается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Опасная зона')).toBeVisible()
    await expect(page.getByText('Удалить аккаунт')).toBeVisible()
  })
})
