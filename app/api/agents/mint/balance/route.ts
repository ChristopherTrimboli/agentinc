import { NextRequest, NextResponse } from "next/server";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { getConnection } from "@/lib/constants/solana";
import { isValidPublicKey, validatePublicKey } from "@/lib/utils/validation";
import { rateLimitByUser } from "@/lib/rateLimit";

// POST /api/agents/mint/balance - Check wallet SOL balance
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const rateLimited = await rateLimitByUser(auth.userId, "mint-balance", 20);
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const { wallet } = body;

    if (!wallet || typeof wallet !== "string") {
      return NextResponse.json(
        { error: "Missing wallet address" },
        { status: 400 },
      );
    }

    // Validate PublicKey before use
    if (!isValidPublicKey(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address: not a valid Solana public key" },
        { status: 400 },
      );
    }

    const connection = getConnection();
    const walletPubkey = validatePublicKey(wallet, "wallet");

    const balanceLamports = await connection.getBalance(walletPubkey);
    const balanceSol = balanceLamports / LAMPORTS_PER_SOL;

    return NextResponse.json({
      balanceLamports,
      balanceSol,
    });
  } catch (error) {
    console.error("Error checking balance:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to check balance";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
