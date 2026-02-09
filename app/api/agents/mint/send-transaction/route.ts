import { NextRequest, NextResponse } from "next/server";
import { serverSignAndSend, sendSignedTransaction } from "@/lib/solana";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";

// POST /api/agents/mint/send-transaction - Sign and send a transaction server-side
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!isAuthResult(authResult)) return authResult;

  // Rate limit: 5 transaction submissions per minute per user
  const rateLimited = await rateLimitByUser(
    authResult.userId,
    "mint-send-tx",
    5,
  );
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const {
      transaction, // unsigned transaction (base64) - for server-side signing
      signedTransaction, // already signed transaction (base64) - for backwards compat
      useJito = true,
    } = body;

    // Server-side signing flow (preferred)
    if (transaction) {
      if (!authResult.walletId) {
        return NextResponse.json(
          { error: "No wallet found for server-side signing" },
          { status: 400 },
        );
      }

      const result = await serverSignAndSend(authResult.walletId, transaction, {
        useJito,
      });
      return NextResponse.json(result);
    }

    // Backwards compatibility: accept pre-signed transactions
    if (signedTransaction) {
      const result = await sendSignedTransaction(signedTransaction, {
        useJito,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Missing transaction or signedTransaction" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[Mint Send Tx] Error sending transaction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
