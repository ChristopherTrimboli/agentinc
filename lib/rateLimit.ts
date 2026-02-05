/**
 * Simple in-memory rate limiter for API routes.
 *
 * NOT suitable for multi-instance/serverless deployments where each instance
 * has its own memory. For distributed rate limiting, use Redis (@upstash/ratelimit).
 * Still valuable as a per-instance safety net against abuse.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodically clean expired entries to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
      }
    },
    5 * 60 * 1000,
  );
}

interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request should be rate limited.
 *
 * @param key     Unique identifier (e.g. userId, IP)
 * @param limit   Max requests per window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    limited: false,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Pre-configured rate limits for expensive API operations.
 * Returns a 429 Response if rate limited, or null if allowed.
 */
export function rateLimitByUser(
  userId: string,
  route: string,
  maxPerMinute: number,
): Response | null {
  const { limited, remaining, resetAt } = checkRateLimit(
    `${route}:${userId}`,
    maxPerMinute,
    60_000,
  );

  if (limited) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded. Please try again later.",
        retryAfterSeconds: retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // Not limited — caller can attach remaining count to response headers if desired
  void remaining;
  return null;
}
