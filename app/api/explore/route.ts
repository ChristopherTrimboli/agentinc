import { NextRequest, NextResponse } from "next/server";
import { fetchExploreData } from "@/lib/data/explore";
import { rateLimitByIP } from "@/lib/rateLimit";

// GET /api/explore - Get minted agents and corporations with token data (paginated)
export async function GET(req: NextRequest) {
  const limited = await rateLimitByIP(req, "explore", 30);
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50") || 50),
    );

    const data = await fetchExploreData({ page, limit });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching explore data:", error);
    return NextResponse.json(
      { error: "Failed to fetch explore data" },
      { status: 500 },
    );
  }
}
