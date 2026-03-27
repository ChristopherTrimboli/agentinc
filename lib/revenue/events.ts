/**
 * Revenue Event Logger
 *
 * Fire-and-forget logging of revenue events to a Redis queue.
 * Called from the payment hot path — never blocks or throws.
 * Events are drained by the batch distributor every 5 minutes.
 *
 * Redis is REQUIRED for this feature. If Redis is unavailable,
 * events are dropped with a warning — the in-memory fallback is not
 * viable in serverless (each instance has its own memory space).
 */

import { isRedisConfigured, getRedis } from "@/lib/redis";

import {
  REDIS_KEYS,
  type RevenueEvent,
  type RevenueEventType,
} from "./constants";

// ── Distribution Lock ────────────────────────────────────────────────────────

const DIST_LOCK_KEY = "revshare:dist_lock";
const DIST_LOCK_TTL_SECONDS = 120;

/**
 * Acquire an exclusive distribution lock via Redis SET NX EX.
 * Returns a release function, or null if the lock is already held.
 */
export async function acquireDistributionLock(): Promise<
  (() => Promise<void>) | null
> {
  if (!isRedisConfigured()) return null;

  const redis = getRedis();
  const lockValue = crypto.randomUUID();

  const acquired = await redis.set(DIST_LOCK_KEY, lockValue, {
    nx: true,
    ex: DIST_LOCK_TTL_SECONDS,
  });

  if (!acquired) return null;

  return async () => {
    try {
      const current = await redis.get<string>(DIST_LOCK_KEY);
      if (current === lockValue) {
        await redis.del(DIST_LOCK_KEY);
      }
    } catch {
      // Lock will expire via TTL
    }
  };
}

// ── Event Logging (Hot Path) ─────────────────────────────────────────────────

/**
 * Log a revenue event to the Redis queue.
 *
 * Designed for the payment hot path:
 * - Single Redis LPUSH (~0.5ms)
 * - Never throws — all errors are swallowed with a console.warn
 * - If Redis is unavailable the event is silently dropped (acceptable tradeoff
 *   vs blocking the payment response or losing events in per-instance memory)
 */
export async function logRevenueEvent(event: RevenueEvent): Promise<void> {
  if (!isRedisConfigured()) {
    console.warn("[Revenue] Redis not configured — dropping revenue event");
    return;
  }

  try {
    await getRedis().lpush(REDIS_KEYS.REVENUE_EVENTS, JSON.stringify(event));
  } catch (error) {
    console.warn("[Revenue] Failed to log event to Redis:", error);
  }
}

/**
 * Build and log a revenue event from payment parameters.
 * Convenience wrapper that constructs the event and calls logRevenueEvent.
 */
export async function logPaymentRevenue(params: {
  type: RevenueEventType;
  grossLamports: number;
  costLamports: number;
  txSignature?: string;
  userId?: string;
}): Promise<void> {
  const profitLamports = Math.max(
    0,
    params.grossLamports - params.costLamports,
  );

  await logRevenueEvent({
    timestamp: Date.now(),
    type: params.type,
    grossLamports: params.grossLamports,
    costLamports: params.costLamports,
    profitLamports,
    txSignature: params.txSignature,
    userId: params.userId,
  });
}

// ── Event Draining (Distributor Only) ────────────────────────────────────────

/**
 * Processing key used as the RENAME target during atomic drain.
 * Events are moved here atomically, then read and deleted.
 */
const PROCESSING_KEY = `${REDIS_KEYS.REVENUE_EVENTS}:processing`;

/**
 * Drain all events from the Redis queue atomically.
 * Called by the distributor — not from the hot path.
 *
 * Uses RENAME to atomically move the queue to a processing key,
 * then reads from the processing key. This guarantees no events
 * pushed between RENAME and the subsequent LRANGE are lost.
 */
export async function drainRevenueEvents(): Promise<RevenueEvent[]> {
  if (!isRedisConfigured()) return [];

  const events: RevenueEvent[] = [];

  try {
    const redis = getRedis();

    // Atomically move the live queue to a processing key.
    // If the source key doesn't exist, RENAME throws — that's fine (no events).
    try {
      await redis.rename(REDIS_KEYS.REVENUE_EVENTS, PROCESSING_KEY);
    } catch {
      // Key doesn't exist = no events queued. This is normal.
      return [];
    }

    // Read all events from the processing key, then delete it
    const raw = await redis.lrange(PROCESSING_KEY, 0, -1);
    await redis.del(PROCESSING_KEY);

    for (const item of raw) {
      try {
        const parsed =
          typeof item === "string" ? JSON.parse(item) : (item as RevenueEvent);
        events.push(parsed);
      } catch {
        console.warn("[Revenue] Skipping malformed event in queue");
      }
    }
  } catch (error) {
    console.error("[Revenue] Failed to drain Redis queue:", error);
  }

  return events;
}

// ── Pending Pool ─────────────────────────────────────────────────────────────

/**
 * Get the current pending pool balance (lamports rolled over from previous cycles).
 */
export async function getPendingPool(): Promise<number> {
  if (!isRedisConfigured()) return 0;

  try {
    const value = await getRedis().get<number>(REDIS_KEYS.PENDING_POOL);
    return value ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Set the pending pool balance.
 */
export async function setPendingPool(lamports: number): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    await getRedis().set(REDIS_KEYS.PENDING_POOL, lamports);
  } catch (error) {
    console.error("[Revenue] Failed to update pending pool:", error);
  }
}
