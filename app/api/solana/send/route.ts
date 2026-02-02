import { NextRequest, NextResponse } from "next/server";
import {
  verifyAuth,
  serverSignAndSend,
  sendSignedTransaction,
  getConnection,
} from "@/lib/solana";

// POST /api/solana/send - Sign and send a transaction server-side
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
      signedTransaction, // already signed transaction (base64) - backwards compat
      waitForConfirmation = true,
    } = body;

    let signature: string;

    // Server-side signing flow (preferred)
    if (transaction) {
      const result = await serverSignAndSend(auth.userId, transaction);
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
        return NextResponse.json(
          { error: "Transaction failed", details: confirmation.value.err },
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
