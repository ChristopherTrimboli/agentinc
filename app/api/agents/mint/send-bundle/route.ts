import { NextRequest, NextResponse } from "next/server";
import { BagsSDK, sendBundleAndConfirm } from "@bagsfm/bags-sdk";
import { VersionedTransaction } from "@solana/web3.js";

import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { getConnection } from "@/lib/constants/solana";
import { signTransaction } from "@/lib/solana";
import { rateLimitByUser } from "@/lib/rateLimit";

// POST /api/agents/mint/send-bundle - Sign (if needed) and send a bundle via Jito
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "mint-send-bundle", 5);
  if (limited) return limited;

  try {
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const { unsignedTransactions } = body;

    if (
      !unsignedTransactions ||
      !Array.isArray(unsignedTransactions) ||
      unsignedTransactions.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing or invalid unsignedTransactions array" },
        { status: 400 },
      );
    }

    if (!auth.walletId) {
      return NextResponse.json(
        { error: "No wallet found for server-side signing" },
        { status: 400 },
      );
    }

    const connection = getConnection();
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    // Sign each transaction sequentially to avoid concurrent Privy signing races
    const finalTxStrings: string[] = [];
    for (const txBase64 of unsignedTransactions) {
      finalTxStrings.push(await signTransaction(auth.walletId, txBase64));
    }

    // Deserialize to VersionedTransaction for Jito bundle submission
    const transactions: VersionedTransaction[] = finalTxStrings.map(
      (txBase64: string) => {
        const txBytes = Buffer.from(txBase64, "base64");
        return VersionedTransaction.deserialize(txBytes);
      },
    );

    const bundleId = await sendBundleAndConfirm(transactions, sdk);

    return NextResponse.json({
      bundleId,
      method: "jito_bundle",
    });
  } catch (error) {
    console.error("[Mint Send Bundle] Error sending bundle:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send bundle";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
