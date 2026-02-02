import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { sendSignedTransaction } from "@/lib/solana";

// POST /api/incorporate/send-transaction - Send a signed transaction to Solana
export async function POST(request: NextRequest) {
  // Require authentication
  const auth = await requireAuth(request);
  if (!isAuthResult(auth)) return auth;

  try {
    const body = await request.json();
    const { signedTransaction, useJito = true } = body;

    if (!signedTransaction) {
      return NextResponse.json(
        { error: "Missing signedTransaction" },
        { status: 400 },
      );
    }

    // Use shared utility for transaction sending (Jito priority + RPC fallback)
    const result = await sendSignedTransaction(signedTransaction, { useJito });

    return NextResponse.json({
      signature: result.signature,
      method: result.method,
    });
  } catch (error) {
    console.error("Error sending transaction:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
