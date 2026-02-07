import { NextResponse } from "next/server";
import { isRedisConfigured, getRedis } from "@/lib/redis";

export interface PriceData {
  price: number;
  priceChange24h?: number;
  marketCap?: number;
  volume24h?: number;
  liquidity?: number;
  earnings?: number;
}

// ── In-memory fallback cache ──────────────────────────────────────────

interface CacheEntry {
  prices: Record<string, PriceData>;
  timestamp: number;
}

const memoryPriceCache = new Map<string, CacheEntry>();
const MEMORY_CACHE_TTL_MS = 30 * 1000;
const MAX_MEMORY_CACHE_SIZE = 100;

const memoryEarningsCache = new Map<
  string,
  { earnings: number; timestamp: number }
>();
const EARNINGS_MEMORY_TTL_MS = 5 * 60 * 1000;

// ── Redis TTLs ──────────────────────────────────────────────────────────

const PRICE_REDIS_TTL = 30; // 30 seconds
const EARNINGS_REDIS_TTL = 300; // 5 minutes

// Max mints per request
const MAX_MINTS = 100;

function getCacheKey(mints: string[]): string {
  return [...mints].sort().join(",");
}

// ── Cache getters (Redis → in-memory fallback) ─────────────────────────

async function getFromCache(mints: string[]): Promise<CacheEntry | null> {
  const key = getCacheKey(mints);

  // Try Redis first
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<CacheEntry>(`prices:${key}`);
      if (cached) return cached;
    } catch {
      // Fall through to memory
    }
  }

  // In-memory fallback
  const memCached = memoryPriceCache.get(key);
  if (memCached && Date.now() - memCached.timestamp < MEMORY_CACHE_TTL_MS) {
    return memCached;
  }
  if (memCached) {
    memoryPriceCache.delete(key);
  }

  return null;
}

async function setCache(
  mints: string[],
  prices: Record<string, PriceData>,
): Promise<void> {
  const key = getCacheKey(mints);
  const entry: CacheEntry = { prices, timestamp: Date.now() };

  // Write to Redis
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(`prices:${key}`, entry, { ex: PRICE_REDIS_TTL });
    } catch {
      // Non-critical
    }
  }

  // Also update in-memory for ultra-fast reads
  memoryPriceCache.set(key, entry);
  if (memoryPriceCache.size > MAX_MEMORY_CACHE_SIZE) {
    const oldestKey = memoryPriceCache.keys().next().value;
    if (oldestKey) memoryPriceCache.delete(oldestKey);
  }
}

// ── Earnings cache (Redis → in-memory fallback) ────────────────────────

async function getCachedEarnings(
  tokenMint: string,
): Promise<number | undefined> {
  // Try Redis first
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<number>(`earnings:${tokenMint}`);
      if (cached !== null && cached !== undefined) return cached;
    } catch {
      // Fall through
    }
  }

  // In-memory fallback
  const memCached = memoryEarningsCache.get(tokenMint);
  if (memCached && Date.now() - memCached.timestamp < EARNINGS_MEMORY_TTL_MS) {
    return memCached.earnings;
  }

  return undefined;
}

async function setCachedEarnings(
  tokenMint: string,
  earnings: number,
): Promise<void> {
  // Write to Redis
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(`earnings:${tokenMint}`, earnings, {
        ex: EARNINGS_REDIS_TTL,
      });
    } catch {
      // Non-critical
    }
  }

  // Also keep in memory
  memoryEarningsCache.set(tokenMint, {
    earnings,
    timestamp: Date.now(),
  });
}

// ── Fetch earnings from Bags API ────────────────────────────────────────

async function fetchEarningsFromBags(
  tokenMint: string,
): Promise<number | undefined> {
  // Check cache first
  const cached = await getCachedEarnings(tokenMint);
  if (cached !== undefined) return cached;

  const apiKey = process.env.BAGS_API_KEY;
  if (!apiKey) {
    return undefined;
  }

  try {
    const response = await fetch(
      `https://public-api-v2.bags.fm/api/v1/token-launch/lifetime-fees?tokenMint=${tokenMint}`,
      {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.response) {
        // Convert lamports to SOL (1 SOL = 1e9 lamports)
        const earningsLamports = BigInt(data.response);
        const earningsSol = Number(earningsLamports) / 1e9;

        // Cache the result
        await setCachedEarnings(tokenMint, earningsSol);

        return earningsSol;
      }
    }
  } catch (error) {
    console.error(`[Prices] Error fetching earnings for ${tokenMint}:`, error);
  }

  return undefined;
}

/**
 * Fetch prices from DexScreener and earnings from Bags API.
 * Used by /api/explore/prices.
 */
export async function fetchPrices(mints: string | null): Promise<NextResponse> {
  try {
    if (!mints) {
      return NextResponse.json({
        prices: {},
        timestamp: Date.now(),
        cached: false,
      });
    }

    const mintList = mints.split(",").filter(Boolean).slice(0, MAX_MINTS);

    if (mintList.length === 0) {
      return NextResponse.json({
        prices: {},
        timestamp: Date.now(),
        cached: false,
      });
    }

    // Check cache first
    const cached = await getFromCache(mintList);
    if (cached) {
      const response = NextResponse.json({
        prices: cached.prices,
        timestamp: cached.timestamp,
        cached: true,
      });
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=30, stale-while-revalidate=60",
      );
      return response;
    }

    const prices: Record<string, PriceData> = {};

    // Fetch prices from DexScreener
    const dexResponse = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mintList.join(",")}`,
      {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 30 },
      },
    );

    if (dexResponse.ok) {
      const data = await dexResponse.json();

      if (data.pairs && Array.isArray(data.pairs)) {
        const liquidityMap = new Map<string, number>();
        const mintSet = new Set(mintList);

        for (const pair of data.pairs) {
          const mint = pair.baseToken?.address;
          if (mint && mintSet.has(mint) && pair.priceUsd) {
            const currentLiquidity = liquidityMap.get(mint) || 0;
            const pairLiquidity = pair.liquidity?.usd || 0;

            if (!prices[mint] || pairLiquidity > currentLiquidity) {
              prices[mint] = {
                price: parseFloat(pair.priceUsd),
                priceChange24h: pair.priceChange?.h24
                  ? parseFloat(pair.priceChange.h24)
                  : undefined,
                marketCap: pair.marketCap || pair.fdv || undefined,
                volume24h: pair.volume?.h24 || undefined,
                liquidity: pairLiquidity || undefined,
              };
              liquidityMap.set(mint, pairLiquidity);
            }
          }
        }
      }
    }

    // Fetch earnings from Bags API in parallel
    const earningsPromises = mintList.map(async (mint) => {
      const earnings = await fetchEarningsFromBags(mint);
      return { mint, earnings };
    });

    const earningsResults = await Promise.all(earningsPromises);

    // Merge earnings into prices
    for (const { mint, earnings } of earningsResults) {
      if (prices[mint]) {
        prices[mint].earnings = earnings;
      } else if (earnings !== undefined) {
        // Create entry even if no DexScreener data
        prices[mint] = { price: 0, earnings };
      }
    }

    // Cache the results
    await setCache(mintList, prices);

    const jsonResponse = NextResponse.json({
      prices,
      timestamp: Date.now(),
      cached: false,
    });

    jsonResponse.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );

    return jsonResponse;
  } catch (error) {
    console.error("[Prices] Error fetching prices:", error);
    return NextResponse.json({
      prices: {},
      timestamp: Date.now(),
      cached: false,
    });
  }
}
