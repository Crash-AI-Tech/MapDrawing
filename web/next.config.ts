import type { NextConfig } from 'next';

// @opennextjs/cloudflare 开发环境本地绑定模拟
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Turbopack 配置 (Next.js 16 默认使用 Turbopack)
  turbopack: {},

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
