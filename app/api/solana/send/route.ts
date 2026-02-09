import { NextRequest, NextResponse } from "next/server";
import {
  sendSignedTransaction,
  getConnection,
  serverSignAndSend,
} from "@/lib/solana";
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
      transaction, // unsigned transaction (base64) - for server-side signing
      signedTransaction, // already signed transaction (base64) - backwards compat
      waitForConfirmation = true,
    } = body;

    let signature: string;

    // Server-side signing flow (preferred)
    if (transaction) {
      if (!authResult.walletId) {
        return NextResponse.json(
          { error: "No wallet found for server-side signing" },
          { status: 400 },
        );
      }

      const result = await serverSignAndSend(authResult.walletId, transaction);
      signature = result.signature;
    } else if (signedTransaction) {
      // Backwards compatibility
      const result = await sendSignedTransaction(signedTransaction);
      signature = result.signature;
    } else {
      return NextResponse.json(
        { error: "Missing transaction or signedTransaction" },
        { status: 400 },
      );
    }

    // Optionally wait for confirmation
    if (waitForConfirmation) {
      const connection = getConnection();
      const confirmation = await connection.confirmTransaction(
        signature,
        "confirmed",
      );

      if (confirmation.value.err) {
        console.error(
          "[Solana Send] Transaction failed on-chain:",
          JSON.stringify(confirmation.value.err),
        );
        return NextResponse.json(
          {
            error: "Transaction failed on-chain",
            details: confirmation.value.err,
          },
          { status: 400 },
        );
      }

      return NextResponse.json({
        signature,
        confirmed: true,
      });
    }

    return NextResponse.json({ signature });
  } catch (error) {
    console.error("Error sending transaction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
