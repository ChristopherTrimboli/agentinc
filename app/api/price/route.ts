import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

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
    return cached;
  }

  // Clean up expired entry
  if (cached) {
    priceCache.delete(mint);
  }

  return null;
}

function setCache(mint: string, price: number | null): void {
  priceCache.set(mint, { price, timestamp: Date.now() });

  // Clean up old cache entries (keep max 50)
  if (priceCache.size > 50) {
    const oldestKey = priceCache.keys().next().value;
    if (oldestKey) priceCache.delete(oldestKey);
  }
}

// Helper to verify auth
async function verifyAuth(req: NextRequest): Promise<string | null> {
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) return null;

  try {
    const privyUser = await privy.users().get({ id_token: idToken });
    return privyUser.id;
  } catch {
    return null;
  }
}

// GET /api/price - Get token price from DexScreener with caching
export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req);

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
