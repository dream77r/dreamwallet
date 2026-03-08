import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@dreamwallet/db', '@dreamwallet/shared'],
  serverActions: {
    bodySizeLimit: '10mb',
  },
}

export default nextConfig
