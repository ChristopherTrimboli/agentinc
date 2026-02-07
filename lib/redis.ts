/**
 * Upstash Redis Client
 *
 * Singleton Redis client for distributed caching, rate limiting,
 * and session management. Uses Upstash serverless Redis which works
 * perfectly with Next.js edge/serverless environments.
 *
 * Environment variables:
 *   KV_REST_API_URL  - Upstash REST API URL
 *   KV_REST_API_TOKEN - Upstash REST API token
 */

import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

/**
 * Get the singleton Redis client.
 *
 * Lazy-initializes on first call to avoid errors when env vars
 * aren't set (e.g. during build time or in dev without Redis).
 */
export function getRedis(): Redis {
  if (!_redis) {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      throw new Error(
        "Redis not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.",
      );
    }
    _redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return _redis;
}

/**
 * Check if Redis is configured (env vars present).
 * Useful for graceful fallback to in-memory when Redis isn't available.
 */
export function isRedisConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * Cache helper: get a value from Redis, or compute and store it.
 *
 * @param key - Redis key
 * @param ttlSeconds - Time to live in seconds
 * @param compute - Function to compute the value if not cached
 * @returns The cached or freshly computed value
 */
export async function cacheGet<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();

  try {
    const cached = await redis.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch (error) {
    console.warn(`[Redis] Cache read failed for ${key}:`, error);
    // Fall through to compute
  }

  const value = await compute();

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.warn(`[Redis] Cache write failed for ${key}:`, error);
  }

  return value;
}

/**
 * Cache helper: set a value in Redis with TTL.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.warn(`[Redis] Cache set failed for ${key}:`, error);
  }
}

/**
 * Cache helper: delete a key from Redis.
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch (error) {
    console.warn(`[Redis] Cache delete failed for ${key}:`, error);
  }
}

export default getRedis;
