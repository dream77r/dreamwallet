import { defineConfig, devices } from '@playwright/test'
import * as path from 'path'

export const AUTH_FILE = path.join(__dirname, 'e2e/.auth/user.json')

/**
 * Playwright E2E configuration for DreamWallet
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  // Глобальный setup: создаёт тестового юзера и сохраняет auth state ОДИН раз
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Auth тесты — без storageState (тестируем сам процесс входа)
    {
      name: 'auth',
      testMatch: ['**/auth.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    // Все остальные тесты — с сохранённой сессией (быстро, без логина)
    {
      name: 'app',
      testMatch: ['**/dashboard.spec.ts', '**/transactions.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },
  ],

  // Запускаем dev-сервер автоматически при локальном запуске
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
