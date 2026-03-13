import IORedis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis?: IORedis };

export const redis = globalForRedis.redis ?? new IORedis(process.env.REDIS_URL || 'redis://localhost:6384', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export const aiCache = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },
};
