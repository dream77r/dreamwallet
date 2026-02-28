module.exports = {
  apps: [
    {
      name: 'dreamwallet-web',
      script: 'apps/web/.next/standalone/apps/web/server.js',
      cwd: '/home/dreamwallet/projects/dreamwallet',
      env: {
        NODE_ENV: 'production',
        PORT: 3300,
        HOSTNAME: '127.0.0.1',
      },
      max_memory_restart: '300M',
      exp_backoff_restart_delay: 100,
    },
    {
      name: 'dreamwallet-worker',
      script: 'apps/worker/dist/index.js',
      cwd: '/home/dreamwallet/projects/dreamwallet',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '200M',
      exp_backoff_restart_delay: 100,
    },
  ],
}
