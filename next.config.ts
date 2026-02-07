import type { NextConfig } from 'next';

// @cloudflare/next-on-pages 要求 setupDevPlatform
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

if (process.env.NODE_ENV === 'development') {
  setupDevPlatform();
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    // R2 自定义域名 (生产环境替换)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
  },

  // Allow MapLibre GL to work properly with webpack
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

export default nextConfig;
