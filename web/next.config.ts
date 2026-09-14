import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// @opennextjs/cloudflare 开发环境本地绑定模拟
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev({
    configPath: path.join(projectRoot, 'server/cloudflare/wrangler.toml'),
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: projectRoot,

  // Turbopack 配置 (Next.js 16 默认使用 Turbopack)
  turbopack: {
    root: projectRoot,
  },

  // Compile the repository-owned packages together with the Next.js app.
  transpilePackages: ['@mapdrawing/contracts', '@mapdrawing/server'],

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
