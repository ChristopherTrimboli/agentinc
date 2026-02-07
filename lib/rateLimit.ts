/**
 * Distributed rate limiter using Upstash Redis.
 *
 * Uses @upstash/ratelimit with sliding window algorithm for accurate,
 * distributed rate limiting that works across serverless instances.
 *
 * Falls back to in-memory rate limiting if Redis is not configured
 * (e.g. local dev without Redis).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { getRedis, isRedisConfigured } from "@/lib/redis";

// ── In-memory fallback (for dev without Redis) ──────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of memoryStore) {
        if (now > entry.resetAt) memoryStore.delete(key);
      }
    },
    5 * 60 * 1000,
  );
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
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

// ── Redis-backed rate limiters (cached per config) ──────────────────────

const rateLimiters = new Map<string, Ratelimit>();

/**
 * Get or create a Redis-backed rate limiter for a given config.
 */
function getRateLimiter(maxPerMinute: number): Ratelimit {
  const key = `rl:${maxPerMinute}`;
  let limiter = rateLimiters.get(key);

  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(maxPerMinute, "1 m"),
      analytics: true,
      prefix: "ratelimit",
    });
    rateLimiters.set(key, limiter);
  }

  return limiter;
}

/**
 * Pre-configured rate limits for expensive API operations.
 * Returns a 429 Response if rate limited, or null if allowed.
 *
 * Uses Redis sliding window when available, falls back to in-memory.
 */
export async function rateLimitByUser(
  userId: string,
  route: string,
  maxPerMinute: number,
): Promise<Response | null> {
  const identifier = `${route}:${userId}`;

  // Use Redis rate limiting if configured
  if (isRedisConfigured()) {
    try {
      const limiter = getRateLimiter(maxPerMinute);
      const { success, remaining, reset } = await limiter.limit(identifier);

      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again later.",
            retryAfterSeconds: retryAfter,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.max(retryAfter, 1)),
              "X-RateLimit-Remaining": "0",
            },
          },
        );
      }

      void remaining;
      return null;
    } catch (error) {
      console.warn("[RateLimit] Redis rate limit failed, using fallback:", error);
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  const { limited, remaining, resetAt } = memoryRateLimit(
    identifier,
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

  void remaining;
  return null;
}

/**
 * Low-level rate limit check. Returns result without building a Response.
 * Useful for custom rate limit responses (e.g. x402 facilitator).
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ limited: boolean; remaining: number; resetAt: number }> {
  if (isRedisConfigured()) {
    try {
      // Convert windowMs to a rate limiter - for non-60s windows,
      // create a one-off limiter with appropriate window
      const windowSeconds = Math.ceil(windowMs / 1000);
      const limiter = new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        prefix: "ratelimit",
      });

      const { success, remaining, reset } = await limiter.limit(key);
      return {
        limited: !success,
        remaining,
        resetAt: reset,
      };
    } catch (error) {
      console.warn("[RateLimit] Redis check failed, using fallback:", error);
    }
  }

  return memoryRateLimit(key, limit, windowMs);
}
