import { NextRequest, NextResponse } from "next/server";

interface PriceData {
  price: number;
  priceChange24h?: number;
  marketCap?: number;
  volume24h?: number;
  liquidity?: number;
  earnings?: number;
}

interface CacheEntry {
  prices: Record<string, PriceData>;
  timestamp: number;
}

// In-memory cache for prices (30 second TTL)
const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// Longer cache for earnings (5 minutes) since it changes less frequently
const earningsCache = new Map<
  string,
  { earnings: number; timestamp: number }
>();
const EARNINGS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(mints: string[]): string {
  return mints.sort().join(",");
}

function getFromCache(mints: string[]): CacheEntry | null {
  const key = getCacheKey(mints);
  const cached = priceCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  if (cached) {
    priceCache.delete(key);
  }

  return null;
}

function setCache(mints: string[], prices: Record<string, PriceData>): void {
  const key = getCacheKey(mints);
  priceCache.set(key, { prices, timestamp: Date.now() });

  if (priceCache.size > 100) {
    const oldestKey = priceCache.keys().next().value;
    if (oldestKey) priceCache.delete(oldestKey);
  }
}

// Fetch earnings from Bags API for a single token
async function fetchEarningsFromBags(
  tokenMint: string,
): Promise<number | undefined> {
  // Check earnings cache first
  const cached = earningsCache.get(tokenMint);
  if (cached && Date.now() - cached.timestamp < EARNINGS_CACHE_TTL_MS) {
    return cached.earnings;
  }

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
        earningsCache.set(tokenMint, {
          earnings: earningsSol,
          timestamp: Date.now(),
        });

        return earningsSol;
      }
    }
  } catch (error) {
    console.error(`Error fetching earnings for ${tokenMint}:`, error);
  }

  return undefined;
}

// GET /api/marketplace/prices - Get prices from DexScreener and earnings from Bags
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mints = searchParams.get("mints");

    if (!mints) {
      return NextResponse.json({
        prices: {},
        timestamp: Date.now(),
        cached: false,
      });
    }

    const mintList = mints.split(",").filter(Boolean).slice(0, 100);

    if (mintList.length === 0) {
      return NextResponse.json({
        prices: {},
        timestamp: Date.now(),
        cached: false,
      });
    }

    // Check cache first
    const cached = getFromCache(mintList);
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

        for (const pair of data.pairs) {
          const mint = pair.baseToken?.address;
          if (mint && mintList.includes(mint) && pair.priceUsd) {
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

    // Fetch earnings from Bags API in parallel (limit concurrency)
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
    setCache(mintList, prices);

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
    console.error("Error fetching prices:", error);
    return NextResponse.json({
      prices: {},
      timestamp: Date.now(),
      cached: false,
    });
  }
}
