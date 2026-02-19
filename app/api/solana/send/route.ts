import { NextRequest, NextResponse } from "next/server";
import { serverSignAndSend, confirmTransactionBySignature } from "@/lib/solana";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";

// POST /api/solana/send - Sign and send a transaction server-side
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!isAuthResult(authResult)) return authResult;

  // Rate limit: 5 transaction submissions per minute per user
  const rateLimited = await rateLimitByUser(
    authResult.userId,
    "solana-send",
    5,
  );
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const {
      transaction, // unsigned transaction (base64)
      waitForConfirmation = true,
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

    const result = await serverSignAndSend(authResult.walletId, transaction);
    const { signature } = result;

    if (waitForConfirmation) {
      try {
        // Poll by signature status — avoids the stale-blockhash problem that
        // occurs when using connection.confirmTransaction with a freshly fetched
        // blockhash that differs from the one embedded in the submitted tx.
        await confirmTransactionBySignature(signature);
        return NextResponse.json({ signature, confirmed: true });
      } catch (confirmError) {
        // Timeout or on-chain failure — return signature so client can query.
        console.warn(
          "[Solana Send] Confirmation issue, tx may still land:",
          signature,
          confirmError,
        );
        return NextResponse.json({ signature, confirmed: false });
      }
    }

    return NextResponse.json({ signature });
  } catch (error) {
    console.error("[Solana Send] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
