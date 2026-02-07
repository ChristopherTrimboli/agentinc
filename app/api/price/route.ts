import { NextRequest, NextResponse } from "next/server";
import { verifyAuthUserId } from "@/lib/auth/verifyRequest";
import { isRedisConfigured, getRedis } from "@/lib/redis";

// SOL mint address
const SOL_MINT = "So11111111111111111111111111111111111111112";

const CACHE_TTL_SECONDS = 30;

// ── Cache helpers (Redis → in-memory fallback) ─────────────────────────

interface CacheEntry {
  price: number | null;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const MEMORY_TTL_MS = 30_000;
const MAX_MEMORY_SIZE = 50;

function redisCacheKey(mint: string): string {
  return `price:single:${mint}`;
}

async function getFromCache(mint: string): Promise<CacheEntry | null> {
  // Try Redis
  if (isRedisConfigured()) {
    try {
      const cached = await getRedis().get<CacheEntry>(redisCacheKey(mint));
      if (cached) return cached;
    } catch {
      // Fall through
    }
  }

  // In-memory fallback
  const mem = memoryCache.get(mint);
  if (mem && Date.now() - mem.timestamp < MEMORY_TTL_MS) return mem;
  if (mem) memoryCache.delete(mint);
  return null;
}

async function setCache(mint: string, price: number | null): Promise<void> {
  const entry: CacheEntry = { price, timestamp: Date.now() };

  // Write to Redis
  if (isRedisConfigured()) {
    try {
      await getRedis().set(redisCacheKey(mint), entry, {
        ex: CACHE_TTL_SECONDS,
      });
    } catch {
      // Non-critical
    }
  }

  // In-memory L1
  memoryCache.delete(mint);
  memoryCache.set(mint, entry);
  while (memoryCache.size > MAX_MEMORY_SIZE) {
    const lruKey = memoryCache.keys().next().value;
    if (lruKey) memoryCache.delete(lruKey);
    else break;
  }
}

// GET /api/price - Get token price from DexScreener with caching
export async function GET(req: NextRequest) {
  const userId = await verifyAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const mint = searchParams.get("mint") || SOL_MINT;

    // Check cache first
    const cached = await getFromCache(mint);
    if (cached) {
      const response = NextResponse.json({
        mint,
        price: cached.price,
        timestamp: cached.timestamp,
        cached: true,
      });
      response.headers.set(
        "Cache-Control",
        "private, max-age=30, stale-while-revalidate=60",
      );
      return response;
    }

    // Fetch from DexScreener
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 30 },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch price" },
        { status: response.status },
      );
    }

    const data = await response.json();

    let price: number | null = null;

    // Find the best price from pairs (highest liquidity)
    if (data.pairs && Array.isArray(data.pairs)) {
      let bestLiquidity = 0;

      for (const pair of data.pairs) {
        const isSolBase = pair.baseToken?.address === mint;
        const isSolQuote = pair.quoteToken?.address === mint;

        if ((isSolBase || isSolQuote) && pair.liquidity?.usd > bestLiquidity) {
          bestLiquidity = pair.liquidity.usd;

          if (isSolBase && pair.priceUsd) {
            price = parseFloat(pair.priceUsd);
          } else if (isSolQuote && pair.priceNative) {
            price = parseFloat(pair.priceUsd) / parseFloat(pair.priceNative);
          }
        }
      }
    }

    // Cache the result
    await setCache(mint, price);

    const jsonResponse = NextResponse.json({
      mint,
      price,
      timestamp: Date.now(),
      cached: false,
    });

    jsonResponse.headers.set(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=60",
    );

    return jsonResponse;
  } catch (error) {
    console.error("Error fetching price:", error);
    return NextResponse.json(
      { error: "Failed to fetch price" },
      { status: 500 },
    );
  }
}
