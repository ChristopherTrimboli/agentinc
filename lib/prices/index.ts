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

// ── Cache TTLs (30 minutes) ──────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000;
const REDIS_TTL_SECONDS = 1800;
const MAX_MEMORY_CACHE_SIZE = 500;
const MAX_MINTS = 100;

// ── Per-mint in-memory caches ────────────────────────────────────────

interface MintPriceEntry {
  data: PriceData;
  timestamp: number;
}

const memoryPriceCache = new Map<string, MintPriceEntry>();
const memoryEarningsCache = new Map<
  string,
  { earnings: number; timestamp: number }
>();

function evictOldest(map: Map<string, unknown>, max: number): void {
  if (map.size <= max) return;
  const oldest = map.keys().next().value;
  if (oldest) map.delete(oldest);
}

// ── Per-mint cache getters (Redis → in-memory fallback) ──────────────

async function getCachedPrice(mint: string): Promise<PriceData | null> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<PriceData>(`price:${mint}`);
      if (cached) return cached;
    } catch {
      // Fall through to memory
    }
  }

  const memCached = memoryPriceCache.get(mint);
  if (memCached && Date.now() - memCached.timestamp < CACHE_TTL_MS) {
    return memCached.data;
  }
  if (memCached) memoryPriceCache.delete(mint);
  return null;
}

async function setCachedPrice(mint: string, data: PriceData): Promise<void> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(`price:${mint}`, data, { ex: REDIS_TTL_SECONDS });
    } catch {
      // Non-critical
    }
  }

  memoryPriceCache.set(mint, { data, timestamp: Date.now() });
  evictOldest(memoryPriceCache, MAX_MEMORY_CACHE_SIZE);
}

// ── Per-mint earnings cache ──────────────────────────────────────────

async function getCachedEarnings(
  tokenMint: string,
): Promise<number | undefined> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<number>(`earnings:${tokenMint}`);
      if (cached !== null && cached !== undefined) return cached;
    } catch {
      // Fall through
    }
  }

  const memCached = memoryEarningsCache.get(tokenMint);
  if (memCached && Date.now() - memCached.timestamp < CACHE_TTL_MS) {
    return memCached.earnings;
  }
  return undefined;
}

async function setCachedEarnings(
  tokenMint: string,
  earnings: number,
): Promise<void> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(`earnings:${tokenMint}`, earnings, {
        ex: REDIS_TTL_SECONDS,
      });
    } catch {
      // Non-critical
    }
  }

  memoryEarningsCache.set(tokenMint, { earnings, timestamp: Date.now() });
  evictOldest(memoryEarningsCache, MAX_MEMORY_CACHE_SIZE);
}

// ── Fetch earnings from Bags API ────────────────────────────────────

export async function fetchEarningsFromBags(
  tokenMint: string,
): Promise<number | undefined> {
  const cached = await getCachedEarnings(tokenMint);
  if (cached !== undefined) return cached;

  const apiKey = process.env.BAGS_API_KEY;
  if (!apiKey) return undefined;

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
        const earningsLamports = BigInt(data.response);
        const earningsSol = Number(earningsLamports) / 1e9;
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
 * Return only cached price data (no external fetches).
 * Used as a graceful fallback when rate limited.
 * Returns null if no cached data is available.
 */
export async function fetchCachedPricesOnly(
  mints: string | null,
): Promise<NextResponse | null> {
  if (!mints) return null;

  const mintList = mints.split(",").filter(Boolean).slice(0, MAX_MINTS);
  if (mintList.length === 0) return null;

  const prices: Record<string, PriceData> = {};
  let hasAny = false;

  await Promise.all(
    mintList.map(async (mint) => {
      const cached = await getCachedPrice(mint);
      if (cached) {
        prices[mint] = cached;
        hasAny = true;
      } else {
        const earnings = await getCachedEarnings(mint);
        if (earnings !== undefined) {
          prices[mint] = { price: 0, earnings };
          hasAny = true;
        }
      }
    }),
  );

  if (!hasAny) return null;

  return NextResponse.json({
    prices,
    timestamp: Date.now(),
    cached: true,
  });
}

/**
 * Fetch prices from DexScreener and earnings from Bags API.
 * Uses per-mint caching with 30-minute TTL — only fetches fresh data
 * for mints that aren't already cached.
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

    // Check per-mint cache, collect misses
    const prices: Record<string, PriceData> = {};
    const uncachedMints: string[] = [];

    await Promise.all(
      mintList.map(async (mint) => {
        const cached = await getCachedPrice(mint);
        if (cached) {
          prices[mint] = cached;
        } else {
          uncachedMints.push(mint);
        }
      }),
    );

    const allCached = uncachedMints.length === 0;

    // Fetch fresh prices only for uncached mints
    if (uncachedMints.length > 0) {
      const dexResponse = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${uncachedMints.join(",")}`,
        {
          headers: { "Content-Type": "application/json" },
          next: { revalidate: 1800 },
        },
      );

      if (dexResponse.ok) {
        const data = await dexResponse.json();

        if (data.pairs && Array.isArray(data.pairs)) {
          const liquidityMap = new Map<string, number>();
          const mintSet = new Set(uncachedMints);

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

      // Fetch earnings for uncached mints in parallel
      const earningsResults = await Promise.all(
        uncachedMints.map(async (mint) => {
          const earnings = await fetchEarningsFromBags(mint);
          return { mint, earnings };
        }),
      );

      for (const { mint, earnings } of earningsResults) {
        if (prices[mint]) {
          prices[mint].earnings = earnings;
        } else if (earnings !== undefined) {
          prices[mint] = { price: 0, earnings };
        }
      }

      // Cache each newly-fetched mint individually
      await Promise.all(
        uncachedMints.map(async (mint) => {
          if (prices[mint]) {
            await setCachedPrice(mint, prices[mint]);
          }
        }),
      );
    }

    const jsonResponse = NextResponse.json({
      prices,
      timestamp: Date.now(),
      cached: allCached,
    });

    jsonResponse.headers.set(
      "Cache-Control",
      "public, s-maxage=1800, stale-while-revalidate=3600",
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
