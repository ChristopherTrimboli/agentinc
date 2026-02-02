import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuth,
  serverSignAndSend,
  sendSignedTransaction,
} from "@/lib/solana";

// POST /api/agents/mint/send-transaction - Sign and send a transaction server-side
export async function POST(req: NextRequest) {
  const idToken = req.headers.get("privy-id-token");
  const auth = await verifyAuth(idToken);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      transaction, // unsigned transaction (base64) - for server-side signing
      signedTransaction, // already signed transaction (base64) - for backwards compat
      useJito = true,
    } = body;

    // Server-side signing flow (preferred)
    if (transaction) {
      const result = await serverSignAndSend(auth.walletId, transaction, {
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
    console.error("Error sending transaction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
