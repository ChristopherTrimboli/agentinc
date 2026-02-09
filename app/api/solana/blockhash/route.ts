import { NextRequest, NextResponse } from "next/server";
import { getRecentBlockhash } from "@/lib/solana";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";

// GET /api/solana/blockhash - Get latest blockhash
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!isAuthResult(authResult)) return authResult;

  // Rate limit: 30 blockhash requests per minute per user
  const rateLimited = await rateLimitByUser(
    authResult.userId,
    "solana-blockhash",
    30,
  );
  if (rateLimited) return rateLimited;

  try {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();

    return NextResponse.json({
      blockhash,
      lastValidBlockHeight,
    });
  } catch (error) {
    console.error("[Solana Blockhash] Error fetching blockhash:", error);
    return NextResponse.json(
      { error: "Failed to fetch blockhash" },
      { status: 500 },
    );
  }
}
