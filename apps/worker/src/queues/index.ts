import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

export const bankSyncQueue = new Queue('bank-sync', { connection })
export const csvImportQueue = new Queue('csv-import', { connection })
export const categorizeQueue = new Queue('categorize', { connection })
export const notificationQueue = new Queue('notification', { connection })
export const reportQueue = new Queue('report', { connection })
export const cleanupQueue = new Queue('cleanup', { connection })
