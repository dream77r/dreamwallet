import { router } from '../trpc'
import { walletRouter } from './wallet'
import { transactionRouter } from './transaction'
import { accountRouter } from './account'
import { projectRouter } from './project'
import { categoryRouter } from './category'
import { budgetRouter } from './budget'
import { settingsRouter } from './settings'
import { importRouter } from './import'
import { billingRouter } from './billing'
import { adminRouter } from './admin'
import { debtsRouter } from './debts'
import { recurringRouter } from './recurring'
import { autoRulesRouter } from './auto-rules'
import { goalsRouter } from './goals'
import { telegramRouter } from './telegram'
import { tagsRouter } from './tags'
import { pushRouter } from './push'
import { insightsRouter } from './insights'
import { aiRouter } from './ai'
import { scoreRouter } from './score'
import { csvTemplatesRouter } from './csv-templates'
import { forecastRouter } from './forecast'
import { dashboardRouter } from './dashboard'
import { cryptoRouter } from './crypto'

export const appRouter = router({
  wallet: walletRouter,
  transaction: transactionRouter,
  account: accountRouter,
  project: projectRouter,
  category: categoryRouter,
  budget: budgetRouter,
  settings: settingsRouter,
  import: importRouter,
  billing: billingRouter,
  admin: adminRouter,
  debts: debtsRouter,
  recurring: recurringRouter,
  autoRules: autoRulesRouter,
  goals: goalsRouter,
  telegram: telegramRouter,
  tags: tagsRouter,
  push: pushRouter,
  insights: insightsRouter,
  ai: aiRouter,
  score: scoreRouter,
  csvTemplates: csvTemplatesRouter,
  forecast: forecastRouter,
  dashboard: dashboardRouter,
  crypto: cryptoRouter,
})

export type AppRouter = typeof appRouter
