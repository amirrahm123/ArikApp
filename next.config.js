const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 } }
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'gstatic-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 } }
    },
    {
      urlPattern: /\/api\/.*/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'api', networkTimeoutSeconds: 10 }
    },
    {
      urlPattern: /\/admin\/.*/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'admin-pages', networkTimeoutSeconds: 10 }
    },
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = withPWA(nextConfig);
