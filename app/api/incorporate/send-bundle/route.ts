import { NextRequest, NextResponse } from "next/server";
import { BagsSDK, sendBundleAndConfirm } from "@bagsfm/bags-sdk";
import { VersionedTransaction } from "@solana/web3.js";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { getConnection } from "@/lib/constants/solana";
import { signTransaction, getRecentBlockhash } from "@/lib/solana";
import { rateLimitByUser } from "@/lib/rateLimit";

/**
 * POST /api/incorporate/send-bundle
 *
 * Accepts unsigned base64 transactions, refreshes blockhashes, signs server-
 * side with the user's Privy wallet, then sends as a Jito bundle via the
 * Bags SDK.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(
    auth.userId,
    "incorporate-send-bundle",
    15,
  );
  if (limited) return limited;

  try {
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 },
      );
    }

    if (!auth.walletId) {
      return NextResponse.json(
        { error: "No wallet found for server-side signing" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { transactions: unsignedTransactions } = body;

    if (
      !unsignedTransactions ||
      !Array.isArray(unsignedTransactions) ||
      unsignedTransactions.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing or invalid transactions array" },
        { status: 400 },
      );
    }

    const { blockhash } = await getRecentBlockhash();

    const signedTxs: VersionedTransaction[] = [];
    for (const txBase64 of unsignedTransactions) {
      const txBytes = Buffer.from(txBase64, "base64");
      const tx = VersionedTransaction.deserialize(txBytes);
      tx.message.recentBlockhash = blockhash;
      const freshBase64 = Buffer.from(tx.serialize()).toString("base64");

      const signedBase64 = await signTransaction(auth.walletId, freshBase64);
      const signedBytes = Buffer.from(signedBase64, "base64");
      signedTxs.push(VersionedTransaction.deserialize(signedBytes));
    }

    const connection = getConnection();
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    const bundleId = await sendBundleAndConfirm(signedTxs, sdk);

    return NextResponse.json({
      bundleId,
      method: "jito_bundle",
    });
  } catch (error) {
    console.error("[Incorporate Send Bundle] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send bundle";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
