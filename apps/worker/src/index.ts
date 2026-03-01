import { Worker, type Processor } from 'bullmq'
import IORedis from 'ioredis'
import pino from 'pino'
import { bankSyncProcessor } from './processors/bank-sync'
import { csvImportProcessor } from './processors/csv-import'
import { categorizeProcessor } from './processors/categorize'
import { notificationProcessor } from './processors/notification'
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

logger.info('All workers started')

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
