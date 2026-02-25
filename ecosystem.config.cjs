module.exports = {
  apps: [
    {
      name: 'dreamwallet-web',
      script: 'apps/web/.next/standalone/apps/web/server.js',
      cwd: '/home/dream/Projects/dreamwallet',
      env: {
        NODE_ENV: 'production',
        PORT: 3300,
        HOSTNAME: '127.0.0.1',
        DATABASE_URL: 'postgresql://dreamwallet:dreamwallet_dev@localhost:5437/dreamwallet',
        REDIS_URL: 'redis://localhost:6384',
        BETTER_AUTH_SECRET: 'change-me-in-production-at-least-32-chars-long',
        BETTER_AUTH_URL: 'https://dreamwallet.brewos.ru',
        NEXT_PUBLIC_APP_URL: 'https://dreamwallet.brewos.ru',
      },
      max_memory_restart: '300M',
      exp_backoff_restart_delay: 100,
    },
    {
      name: 'dreamwallet-worker',
      script: 'apps/worker/dist/index.js',
      cwd: '/home/dream/Projects/dreamwallet',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://dreamwallet:dreamwallet_dev@localhost:5437/dreamwallet',
        REDIS_URL: 'redis://localhost:6384',
      },
      max_memory_restart: '200M',
      exp_backoff_restart_delay: 100,
    },
  ],
}
