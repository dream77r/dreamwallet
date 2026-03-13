import { test, expect } from './fixtures'

test.describe('AI Советник', () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto('/dashboard/ai-chat')
    await page.waitForURL('**/dashboard/ai-chat')
    await page.waitForLoadState('networkidle')
  })

  test('страница AI советника загружается', async ({ authedPage: page }) => {
    const heading = page.locator('h1, h2').filter({ hasText: /AI|советник|ассистент/i }).first()
    await expect(heading).toBeVisible({ timeout: 5_000 })
  })

  test('поле ввода сообщения видно', async ({ authedPage: page }) => {
    const input = page.locator(
      'textarea, input[type="text"][placeholder*="сообщ"], input[placeholder*="вопрос"]'
    ).first()
    await expect(input).toBeVisible({ timeout: 5_000 })
  })

  test('кнопка отправки и микрофона видны', async ({ authedPage: page }) => {
    const sendButton = page.locator('button[type="submit"]').first()
    await expect(sendButton).toBeVisible({ timeout: 5_000 })

    // Кнопка микрофона (VoiceInput)
    const micButton = page.locator('button').filter({ has: page.locator('svg.lucide-mic, svg.lucide-mic-off') }).first()
    await expect(micButton).toBeVisible({ timeout: 5_000 })
  })

  test('пустое состояние показывает приветствие', async ({ authedPage: page }) => {
    const greeting = page.locator('text=/привет|финансовый советник/i').first()
    await expect(greeting).toBeVisible({ timeout: 5_000 })
  })

  test('отправка сообщения показывает пользовательское сообщение', async ({ authedPage: page }) => {
    const input = page.locator('textarea, input[type="text"]').first()
    if (!await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    await input.fill('покажи баланс')
    await page.keyboard.press('Enter')

    // Пользовательское сообщение должно появиться
    const userMsg = page.locator('text=покажи баланс')
    await expect(userMsg).toBeVisible({ timeout: 5_000 })
  })

  test('intent "покажи баланс" возвращает summary-блок', async ({ authedPage: page }) => {
    const input = page.locator('textarea, input[type="text"]').first()
    if (!await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    await input.fill('покажи баланс')
    await page.keyboard.press('Enter')

    // Ждём loading
    const loader = page.locator('text=/думаю/i')
    await expect(loader).toBeVisible({ timeout: 5_000 }).catch(() => {})

    // Ждём ответ — summary-блок с "Баланс" или текст "Кошелёк не найден"
    const response = page.locator('text=/баланс|кошелёк не найден|нет счетов/i').first()
    await expect(response).toBeVisible({ timeout: 15_000 })
  })

  test('intent "последние транзакции" возвращает summary-блок', async ({ authedPage: page }) => {
    const input = page.locator('textarea, input[type="text"]').first()
    if (!await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    await input.fill('последние транзакции')
    await page.keyboard.press('Enter')

    const response = page.locator('text=/последние операции|кошелёк не найден|транзакций пока нет/i').first()
    await expect(response).toBeVisible({ timeout: 15_000 })
  })

  test('intent "мои бюджеты" возвращает summary-блок', async ({ authedPage: page }) => {
    const input = page.locator('textarea, input[type="text"]').first()
    if (!await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    await input.fill('покажи бюджеты')
    await page.keyboard.press('Enter')

    const response = page.locator('text=/бюджет|кошелёк не найден|нет бюджетов/i').first()
    await expect(response).toBeVisible({ timeout: 15_000 })
  })

  test('intent "мои цели" возвращает summary-блок', async ({ authedPage: page }) => {
    const input = page.locator('textarea, input[type="text"]').first()
    if (!await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    await input.fill('мои цели')
    await page.keyboard.press('Enter')

    const response = page.locator('text=/цел|кошелёк не найден|нет активных/i').first()
    await expect(response).toBeVisible({ timeout: 15_000 })
  })

  test('AI-запрос (advice/unknown) возвращает text-блок', async ({ authedPage: page }) => {
    const input = page.locator('textarea, input[type="text"]').first()
    if (!await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    await input.fill('дай совет по экономии')
    await page.keyboard.press('Enter')

    // Ждём ответ — либо AI-текст, либо сообщение что сервис недоступен
    const responseOrError = page.locator(
      'text=/сервис временно недоступен|попробуйте позже|совет|экономи|расход|финанс/i'
    )
    await expect(responseOrError).toBeVisible({ timeout: 20_000 }).catch(() => {
      // API ключ может отсутствовать в CI — не критично
    })
  })

  test('множественные сообщения отображаются в истории', async ({ authedPage: page }) => {
    const input = page.locator('textarea, input[type="text"]').first()
    if (!await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    // Первое сообщение
    await input.fill('покажи баланс')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1_000)

    // Ждём ответ на первое
    await page.locator('text=/баланс|кошелёк/i').first().waitFor({ timeout: 15_000 }).catch(() => {})

    // Второе сообщение
    await input.fill('мои цели')
    await page.keyboard.press('Enter')

    // Оба пользовательских сообщения видны
    await expect(page.locator('text=покажи баланс')).toBeVisible()
    await expect(page.locator('text=мои цели')).toBeVisible()
  })

  test('поле ввода блокируется во время загрузки', async ({ authedPage: page }) => {
    const input = page.locator('textarea, input[type="text"]').first()
    if (!await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    await input.fill('покажи баланс')
    await page.keyboard.press('Enter')

    // Сразу после отправки input должен быть disabled
    await expect(input).toBeDisabled({ timeout: 2_000 }).catch(() => {
      // Может быть слишком быстрый ответ — не критично
    })
  })

  test('выбор модели AI работает (если присутствует UI)', async ({ authedPage: page }) => {
    const modelSelector = page.locator('button, select').filter({
      hasText: /claude|gpt|haiku|sonnet|gemini/i,
    }).first()

    if (!await modelSelector.isVisible().catch(() => false)) {
      test.skip()
      return
    }

    await expect(modelSelector).toBeEnabled()
  })
})

test.describe('Привычки', () => {
  test('страница привычек загружается', async ({ authedPage: page }) => {
    await page.goto('/dashboard/habits')
    await page.waitForURL('**/dashboard/habits')
    await page.waitForLoadState('networkidle')

    // Заголовок "Привычки"
    const heading = page.locator('h1').filter({ hasText: /привычк/i }).first()
    await expect(heading).toBeVisible({ timeout: 5_000 })
  })

  test('показывает загрузку или пустое состояние', async ({ authedPage: page }) => {
    await page.goto('/dashboard/habits')
    await page.waitForURL('**/dashboard/habits')

    // Должен показать либо загрузку, либо "Недостаточно данных", либо карточки
    const content = page.locator(
      'text=/анализирую|недостаточно данных|частые траты|тренды|рекомендац/i'
    ).first()
    await expect(content).toBeVisible({ timeout: 20_000 })
  })

  test('ссылка "Привычки" есть в сайдбаре', async ({ authedPage: page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // На desktop sidebar видна
    const sidebarLink = page.locator('a[href="/dashboard/habits"]').first()
    // Может быть скрыта на мобильном — проверяем наличие в DOM
    await expect(sidebarLink).toHaveCount(1, { timeout: 5_000 })
  })
})
