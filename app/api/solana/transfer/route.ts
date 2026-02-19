import { NextRequest, NextResponse } from "next/server";

import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { sendSolFromWallet, withWalletLock } from "@/lib/privy/wallet-service";
import { rateLimitByUser } from "@/lib/rateLimit";
import { isValidPublicKey } from "@/lib/utils/validation";

// POST /api/solana/transfer - Transfer SOL from the user's active server-owned wallet
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!isAuthResult(authResult)) return authResult;

  const rateLimited = await rateLimitByUser(
    authResult.userId,
    "solana-transfer",
    5,
  );
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const { to, amountSol } = body;

    if (!to || typeof to !== "string" || !isValidPublicKey(to)) {
      return NextResponse.json(
        { error: "Invalid recipient address" },
        { status: 400 },
      );
    }

    if (typeof amountSol !== "number" || amountSol <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 },
      );
    }

    if (!authResult.walletId || !authResult.walletAddress) {
      return NextResponse.json(
        { error: "No active wallet found" },
        { status: 400 },
      );
    }

    const lamports = BigInt(Math.floor(amountSol * 1e9));

    const result = await withWalletLock(authResult.walletAddress, () =>
      sendSolFromWallet(
        authResult.walletId!,
        authResult.walletAddress!,
        to,
        lamports,
      ),
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Transfer failed" },
        { status: 400 },
      );
    }

    return NextResponse.json({ signature: result.signature });
  } catch (error) {
    console.error("[Solana Transfer] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transfer failed" },
      { status: 500 },
    );
  }
}
