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
  // Keep default build behavior; avoid aggressive buildExcludes which can break asset handling
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
    ],
    // On Netlify, the Next image optimization may not run the same way as Vercel.
    // Disable the built-in optimizer if you prefer to serve images statically or via a proxy.
    unoptimized: true
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

// Export the Next.js config wrapped with the PWA plugin.
export default withPWA(config);
