type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  apiRateLimits?: Map<string, RateLimitEntry>;
};

const store = globalForRateLimit.apiRateLimits ?? new Map<string, RateLimitEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.apiRateLimits = store;
}

export function checkRateLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}
