declare module "next-pwa" {
  import type { NextConfig } from "next";

  type RuntimeCaching = {
    urlPattern: RegExp | string;
    handler:
      | "CacheFirst"
      | "CacheOnly"
      | "NetworkFirst"
      | "NetworkOnly"
      | "StaleWhileRevalidate";
    options?: Record<string, unknown>;
  };

  type PwaOptions = {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    clientsClaim?: boolean;
    cleanupOutdatedCaches?: boolean;
    fallbacks?: Record<string, string>;
    runtimeCaching?: RuntimeCaching[];
  };

  export default function withPWAInit(
    options?: PwaOptions,
  ): (config: NextConfig) => NextConfig;
}
