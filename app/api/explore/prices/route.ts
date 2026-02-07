import { NextRequest, NextResponse } from "next/server";
import { fetchPrices } from "@/lib/prices";
import { rateLimitByIP } from "@/lib/rateLimit";

// GET /api/explore/prices - Get prices from DexScreener and earnings from Bags
export async function GET(req: NextRequest) {
  const limited = await rateLimitByIP(req, "explore-prices", 30);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const mints = searchParams.get("mints");

  // Validate mints param length to prevent abuse
  if (mints && mints.length > 2000) {
    return NextResponse.json(
      { error: "Too many mints requested" },
      { status: 400 },
    );
  }

  return fetchPrices(mints);
}
