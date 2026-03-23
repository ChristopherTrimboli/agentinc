import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import {
  sendSignedTransaction,
  simulateSignedTransaction,
  confirmTransactionBySignature,
} from "@/lib/solana";
import { rateLimitByUser } from "@/lib/rateLimit";

// POST /api/incorporate/send-transaction - Send a signed transaction to Solana
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "incorporate-send-tx", 20);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { signedTransaction, useJito = true, confirm = false } = body;

    if (!signedTransaction) {
      return NextResponse.json(
        { error: "Missing signedTransaction" },
        { status: 400 },
      );
    }

    // Simulate before sending for early failure with useful diagnostics
    const sim = await simulateSignedTransaction(signedTransaction);
    if (sim.err) {
      const logSummary = sim.logs?.slice(-5).join(" | ") ?? "no logs";
      console.error(
        "[Incorporate Send Tx] Simulation failed:",
        JSON.stringify(sim.err),
        logSummary,
      );
      return NextResponse.json(
        {
          error: `Transaction simulation failed: ${JSON.stringify(sim.err)}`,
          logs: sim.logs?.slice(-5),
        },
        { status: 400 },
      );
    }

    const result = await sendSignedTransaction(signedTransaction, { useJito });

    if (confirm) {
      await confirmTransactionBySignature(result.signature, 60_000, 1_500);
    }

    return NextResponse.json({
      signature: result.signature,
      method: result.method,
      confirmed: confirm,
    });
  } catch (error) {
    console.error("[Incorporate Send Tx] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
