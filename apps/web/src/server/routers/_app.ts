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
import { recurringRouter } from './recurring'
import { autoRulesRouter } from './auto-rules'
import { goalsRouter } from './goals'

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
  recurring: recurringRouter,
  autoRules: autoRulesRouter,
  goals: goalsRouter,
})

export type AppRouter = typeof appRouter
