import { NextRequest } from "next/server";
import { fetchPrices } from "@/lib/prices";

// GET /api/explore/prices - Get prices from DexScreener and earnings from Bags
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mints = searchParams.get("mints");
  return fetchPrices(mints);
}
