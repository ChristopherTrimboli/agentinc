import { NextRequest, NextResponse } from "next/server";
import { verifyAuthUserId } from "@/lib/auth/verifyRequest";

// SOL mint address
const SOL_MINT = "So11111111111111111111111111111111111111112";

// In-memory cache for prices (30 second TTL)
interface CacheEntry {
  price: number | null;
  timestamp: number;
}

const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

function getFromCache(mint: string): CacheEntry | null {
  const cached = priceCache.get(mint);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    // LRU: re-insert to move to end of Map iteration order
    priceCache.delete(mint);
    priceCache.set(mint, cached);
    return cached;
  }

  // Clean up expired entry
  if (cached) {
    priceCache.delete(mint);
  }

  return null;
}

function setCache(mint: string, price: number | null): void {
  // Delete first to ensure it's at the end (most recently used)
  priceCache.delete(mint);
  priceCache.set(mint, { price, timestamp: Date.now() });

  // Evict least recently used entries (at the front of Map iteration order)
  while (priceCache.size > 50) {
    const lruKey = priceCache.keys().next().value;
    if (lruKey) priceCache.delete(lruKey);
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
    const cached = getFromCache(mint);
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
        next: { revalidate: 30 }, // Next.js fetch cache
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
    setCache(mint, price);

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
