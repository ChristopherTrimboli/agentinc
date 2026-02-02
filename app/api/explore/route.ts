import { NextResponse } from "next/server";
import { fetchMarketplaceData } from "@/lib/data/marketplace";

// GET /api/explore - Get all minted agents and corporations with token data
export async function GET() {
  try {
    // Use optimized query function (no N+1 queries)
    const data = await fetchMarketplaceData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching explore data:", error);
    return NextResponse.json(
      { error: "Failed to fetch explore data" },
      { status: 500 },
    );
  }
}
