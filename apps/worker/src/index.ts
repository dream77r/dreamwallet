import { Worker, Queue, type Processor } from 'bullmq'
import IORedis from 'ioredis'
import pino from 'pino'
import { bankSyncProcessor } from './processors/bank-sync'
import { csvImportProcessor } from './processors/csv-import'
import { categorizeProcessor } from './processors/categorize'
import { notificationProcessor } from './processors/notification'
import { recurringProcessor } from './processors/recurring'
import { exchangeRatesProcessor } from './processors/exchange-rates'
import { gamificationProcessor } from './processors/gamification'
import { smartRulesProcessor } from './processors/smart-rules'
import { proactiveAdviceProcessor } from './processors/proactive-advice'
import { stockPricesProcessor } from './processors/stock-prices'
import { createBot } from './telegram/bot'

const logger = pino({ name: 'dreamwallet-worker' })

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

const workers: Worker[] = []

function createWorker<T = any>(name: string, processor: Processor<T>) {
  const worker = new Worker(name, processor, {
    connection,
    concurrency: 5,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  })

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, queue: name }, 'Job completed')
  })

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, queue: name, error: err.message }, 'Job failed')
  })

  workers.push(worker)
  logger.info(`Worker started: ${name}`)
  return worker
}

// Start all workers
createWorker('bank-sync', bankSyncProcessor)
createWorker('csv-import', csvImportProcessor)
createWorker('categorize', categorizeProcessor)
createWorker('notification', notificationProcessor)
createWorker('recurring', recurringProcessor)
createWorker('exchange-rates', exchangeRatesProcessor)
createWorker('gamification', gamificationProcessor)
createWorker('smart-rules', smartRulesProcessor)
createWorker('proactive-advice', proactiveAdviceProcessor)
createWorker('stock-prices', stockPricesProcessor)

logger.info('All workers started')

// Weekly digest cron — every Sunday at 9:00 Moscow time
const notifQueue = new Queue('notifications', { connection })
notifQueue.add('weekly-digest', { type: 'weekly_digest' }, {
  repeat: { pattern: '0 9 * * 0', tz: 'Europe/Moscow' },
  jobId: 'weekly-digest-cron',
}).then(() => {
  logger.info('Weekly digest cron scheduled (Sun 09:00 Europe/Moscow)')
}).catch((err) => {
  logger.error(err, 'Failed to schedule weekly digest cron')
})

notifQueue.add('recurring-reminder', { type: 'recurring_reminder' }, {
  repeat: { pattern: '0 8 * * *', tz: 'Europe/Moscow' },
  jobId: 'recurring-reminder-cron',
}).then(() => {
  logger.info('Recurring reminder cron scheduled (daily 08:00 Europe/Moscow)')
}).catch((err) => {
  logger.error(err, 'Failed to schedule recurring reminder cron')
})


// Proactive advice — every day at 20:00 Moscow time
const proactiveAdviceQueue = new Queue('proactive-advice', { connection })
proactiveAdviceQueue.add('proactive-advice-daily', {}, {
  repeat: { pattern: '0 20 * * *', tz: 'Europe/Moscow' },
  jobId: 'proactive-advice-daily-cron',
}).then(() => {
  logger.info('Proactive advice cron scheduled (daily 20:00 Europe/Moscow)')
}).catch((err) => {
  logger.error(err, 'Failed to schedule proactive advice cron')
})

// Exchange rates — daily at 10:00 Moscow time (after CBR publishes)
const exchangeRatesQueue = new Queue('exchange-rates', { connection })
exchangeRatesQueue.add('sync-rates', {}, {
  repeat: { pattern: '0 10 * * *', tz: 'Europe/Moscow' },
  jobId: 'exchange-rates-daily-cron',
}).then(() => {
  logger.info('Exchange rates cron scheduled (daily 10:00 Europe/Moscow)')
}).catch((err) => {
  logger.error(err, 'Failed to schedule exchange rates cron')
})

// Gamification — daily at 22:00 Moscow time
const gamificationQueue = new Queue('gamification', { connection })
gamificationQueue.add('daily-check', {}, {
  repeat: { pattern: '0 22 * * *', tz: 'Europe/Moscow' },
  jobId: 'gamification-daily-cron',
}).then(() => {
  logger.info('Gamification cron scheduled (daily 22:00 Europe/Moscow)')
}).catch((err) => {
  logger.error(err, 'Failed to schedule gamification cron')
})

// Smart rules — weekly on Monday at 03:00 Moscow time
const smartRulesQueue = new Queue('smart-rules', { connection })
smartRulesQueue.add('weekly-analysis', {}, {
  repeat: { pattern: '0 3 * * 1', tz: 'Europe/Moscow' },
  jobId: 'smart-rules-weekly-cron',
}).then(() => {
  logger.info('Smart rules cron scheduled (Mon 03:00 Europe/Moscow)')
}).catch((err) => {
  logger.error(err, 'Failed to schedule smart rules cron')
})

// Stock prices — daily at 19:00 Moscow time (after MOEX close)
const stockPricesQueue = new Queue('stock-prices', { connection })
stockPricesQueue.add('sync-prices', {}, {
  repeat: { pattern: '0 19 * * 1-5', tz: 'Europe/Moscow' },
  jobId: 'stock-prices-daily-cron',
}).then(() => {
  logger.info('Stock prices cron scheduled (Mon-Fri 19:00 Europe/Moscow)')
}).catch((err) => {
  logger.error(err, 'Failed to schedule stock prices cron')
})

// Recurring transactions — every day at 09:00 Moscow time
const recurringQueue = new Queue('recurring', { connection })
recurringQueue.add('process-recurring', {}, {
  repeat: { pattern: '0 9 * * *', tz: 'Europe/Moscow' },
  jobId: 'recurring-daily-cron',
}).then(() => {
  logger.info('Recurring transactions cron scheduled (daily 09:00 Europe/Moscow)')
}).catch((err) => {
  logger.error(err, 'Failed to schedule recurring cron')
})

// Start Telegram bot (if token configured)
const botToken = process.env.TELEGRAM_BOT_TOKEN
if (botToken) {
  const bot = createBot(botToken)
  bot.start({ drop_pending_updates: true })
    .catch((err) => logger.error(err, 'Telegram bot crashed'))
  logger.info('Telegram bot started (polling mode)')
} else {
  logger.warn('TELEGRAM_BOT_TOKEN not set — bot disabled')
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down workers...')
  await Promise.all(workers.map((w) => w.close()))
  await connection.quit()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
