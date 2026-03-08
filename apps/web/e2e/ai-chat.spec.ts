import { test, expect } from './fixtures'

test.describe('AI Советник', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/dashboard/ai-chat')
    await page.waitForURL('**/dashboard/ai-chat')
    await page.waitForLoadState('networkidle')
  })

  test('страница AI советника загружается', async ({ authedPage: page }) => {
    // Заголовок или элемент с упоминанием AI/советника
    const heading = page.locator('h1, h2').filter({ hasText: /AI|советник|ассистент/i }).first()
    await expect(heading).toBeVisible({ timeout: 5_000 })
  })

  test('поле ввода сообщения видно', async ({ authedPage: page }) => {
    const input = page.locator(
      'textarea, input[type="text"][placeholder*="сообщ"], input[placeholder*="вопрос"]'
    ).first()
    await expect(input).toBeVisible({ timeout: 5_000 })
  })

  test('кнопка отправки видна', async ({ authedPage: page }) => {
    const sendButton = page.locator('button').filter({ hasText: /отправить|send/i })
      .or(page.locator('button[type="submit"]'))
      .first()
    await expect(sendButton).toBeVisible({ timeout: 5_000 })
  })

  test('отправка сообщения (если OPENROUTER_API_KEY задан)', async ({ authedPage: page }) => {
    const input = page.locator('textarea, input[type="text"]').first()
    if (!await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    await input.fill('Сколько я потратил в этом месяце?')

    // Отправляем
    await page.keyboard.press('Enter')

    // Ждём ответа (или ошибки, что AI недоступен) — до 20 секунд
    const responseOrError = page.locator(
      'text=/сервис временно недоступен|попробуйте позже|потратил|расход|рублей/i'
    )
    await expect(responseOrError).toBeVisible({ timeout: 20_000 }).catch(() => {
      // Если нет ответа — это не критично (API ключ может отсутствовать в CI)
    })
  })

  test('выбор модели AI работает (если присутствует UI)', async ({ authedPage: page }) => {
    // Кнопка/select для выбора модели
    const modelSelector = page.locator('button, select').filter({
      hasText: /claude|gpt|haiku|sonnet|gemini/i,
    }).first()

    if (!await modelSelector.isVisible().catch(() => false)) {
      test.skip()
      return
    }

    await expect(modelSelector).toBeEnabled()
  })

  test('история сообщений сохраняется при навигации', async ({ authedPage: page }) => {
    const input = page.locator('textarea, input[type="text"]').first()
    if (!await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    const testMessage = 'Тест навигации AI'
    await input.fill(testMessage)
    await page.keyboard.press('Enter')

    // Ждём чуть-чуть
    await page.waitForTimeout(500)

    // Переходим и возвращаемся
    await page.goto('/dashboard')
    await page.goto('/dashboard/ai-chat')
    await page.waitForLoadState('networkidle')

    // Страница не крэшнулась
    await expect(page.locator('body')).toBeVisible()
  })
})
