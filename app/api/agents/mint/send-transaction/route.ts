import { NextRequest, NextResponse } from "next/server";
import {
  signTransaction,
  sendSignedTransaction,
  simulateSignedTransaction,
  confirmTransactionBySignature,
} from "@/lib/solana";
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
      transaction, // unsigned transaction (base64)
      useJito = true,
      waitForConfirmation = false,
    } = body;

    if (!transaction) {
      return NextResponse.json(
        { error: "Missing transaction" },
        { status: 400 },
      );
    }

    if (!authResult.walletId) {
      return NextResponse.json(
        { error: "No wallet found for server-side signing" },
        { status: 400 },
      );
    }

    // Sign first, then simulate the fully-signed tx before submitting
    const signedTransaction = await signTransaction(
      authResult.walletId,
      transaction,
    );

    const sim = await simulateSignedTransaction(signedTransaction);
    if (sim.err) {
      const logSummary = sim.logs?.slice(-5).join(" | ") ?? "no logs";
      throw new Error(
        `Transaction simulation failed: ${JSON.stringify(sim.err)} — ${logSummary}`,
      );
    }

    const result = await sendSignedTransaction(signedTransaction, { useJito });

    if (waitForConfirmation) {
      await confirmTransactionBySignature(result.signature);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Mint Send Tx] Error sending transaction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
