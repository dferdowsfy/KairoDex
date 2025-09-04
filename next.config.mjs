import nextPWA from 'next-pwa';
import runtimeCaching from 'next-pwa/cache.js';

const extraCaching = [
  {
    urlPattern: /^https:\/\/[^/]+\/_next\/image/,
    handler: 'CacheFirst',
    options: { cacheName: 'next-image' }
  },
  {
    urlPattern: /^\/api\//,
    handler: 'NetworkOnly',
    options: {
      backgroundSync: {
        name: 'api-queue',
        options: { maxRetentionTime: 24 * 60 }
      }
    }
  }
];

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [...runtimeCaching, ...extraCaching],
  // In App Router-only projects, avoid injecting legacy pages assets like /_error
  buildExcludes: [/^.*$/], // let Next handle assets; keep our own runtimeCaching
});

/** @type {import('next').NextConfig} */
const config = {
  // Disable optimizePackageImports to avoid rare dev-time chunk resolution issues
  experimental: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      }
    ]
  },
  // For Netlify deployment
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withPWA(config);
