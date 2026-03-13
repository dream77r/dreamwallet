import { test, expect } from './fixtures'

test.describe('Accounts page', () => {
  test('страница счетов загружается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/accounts')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h1').first()).toContainText('Счета')
    await expect(page.locator('body')).not.toContainText('Application error')
  })

  test('summary карточки отображаются', async ({ authedPage: page }) => {
    await page.goto('/dashboard/accounts')
    await page.waitForLoadState('networkidle')

    // Три summary карточки
    await expect(page.getByText('Чистый капитал')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Всего активов')).toBeVisible()
    await expect(page.getByText('Общий долг')).toBeVisible()
  })

  test('список счетов или пустое состояние', async ({ authedPage: page }) => {
    await page.goto('/dashboard/accounts')
    await page.waitForLoadState('networkidle')

    // Либо карточки счетов с балансом, либо onboarding "Добавьте первый счёт"
    const emptyState = page.getByText('Добавьте первый счёт')
    const accountBalance = page.getByText('Текущий баланс')

    const hasEmpty = await emptyState.isVisible().catch(() => false)
    const hasAccounts = (await accountBalance.count()) > 0

    expect(hasEmpty || hasAccounts).toBeTruthy()
  })

  test('подзаголовок показывает количество счетов', async ({ authedPage: page }) => {
    await page.goto('/dashboard/accounts')
    await page.waitForLoadState('networkidle')

    // Подзаголовок "N счёт/счёта/счетов и кошельков" или "Загрузка..."
    const subtitle = page.getByText(/(?:счёт|счёта|счетов|Загрузка)/)
    await expect(subtitle.first()).toBeVisible({ timeout: 10_000 })
  })

  test('карточка "Добавить счёт" видна если есть счета', async ({ authedPage: page }) => {
    await page.goto('/dashboard/accounts')
    await page.waitForLoadState('networkidle')

    const addCard = page.getByText('Добавить счёт')
    // Карточка "Добавить счёт" всегда присутствует — либо как dashed card, либо как кнопка onboarding
    await expect(addCard.first()).toBeVisible({ timeout: 10_000 })
  })
})
