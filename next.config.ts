import type { NextConfig } from "next";
import withPWAInit from "next-pwa";
import createBundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: false,
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  fallbacks: {
    document: "/offline",
  },
  runtimeCaching: [
    {
      urlPattern: /^https?:\/\/[^/]+\/(?:$|\?source=pwa$|offline$|manifest\.json$|manifest\.webmanifest$)/,
      handler: "NetworkFirst",
      options: {
        cacheName: "cuedesk-pages",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [200],
        },
        networkTimeoutSeconds: 5,
      },
    },
    {
      urlPattern: /^https?:\/\/[^/]+\/_next\/static\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "cuedesk-next-static",
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [200],
        },
      },
    },
    {
      urlPattern: /^https?:\/\/[^/]+\/(?:icons|screenshots)\/.*\.(?:png|svg|webp|jpg|jpeg|ico)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "cuedesk-images",
        expiration: {
          maxEntries: 96,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [200],
        },
      },
    },
    {
      urlPattern: /^https?:\/\/[^/]+\/.*\.(?:png|svg|webp|jpg|jpeg|gif|ico|woff2?)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "cuedesk-assets",
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [200],
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    const manifestHeaders = [
      {
        key: "Content-Type",
        value: "application/manifest+json; charset=utf-8",
      },
      {
        key: "Cache-Control",
        value: "public, max-age=0, must-revalidate",
      },
    ];

    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: manifestHeaders,
      },
      {
        source: "/manifest.json",
        headers: manifestHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(withPWA(nextConfig));
