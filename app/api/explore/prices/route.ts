import { NextRequest, NextResponse } from "next/server";
import { fetchPrices, fetchCachedPricesOnly } from "@/lib/prices";
import { rateLimitByIP } from "@/lib/rateLimit";

// GET /api/explore/prices - Get prices from DexScreener and earnings from Bags
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mints = searchParams.get("mints");

  if (mints && mints.length > 2000) {
    return NextResponse.json(
      { error: "Too many mints requested" },
      { status: 400 },
    );
  }

  const limited = await rateLimitByIP(req, "explore-prices", 30);
  if (limited) {
    const cached = await fetchCachedPricesOnly(mints);
    if (cached) return cached;
    return limited;
  }

  return fetchPrices(mints);
}
