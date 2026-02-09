import { NextRequest, NextResponse } from "next/server";
import { BagsSDK, sendBundleAndConfirm } from "@bagsfm/bags-sdk";
import { VersionedTransaction } from "@solana/web3.js";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { getConnection } from "@/lib/constants/solana";
import { rateLimitByUser } from "@/lib/rateLimit";

// POST /api/incorporate/send-bundle - Send a signed bundle via Jito using SDK
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(
    auth.userId,
    "incorporate-send-bundle",
    5,
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

    const body = await req.json();
    const { signedTransactions } = body;

    if (
      !signedTransactions ||
      !Array.isArray(signedTransactions) ||
      signedTransactions.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing or invalid signedTransactions array" },
        { status: 400 },
      );
    }

    const connection = getConnection();
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    // Deserialize transactions
    const transactions: VersionedTransaction[] = signedTransactions.map(
      (txBase64: string) => {
        const txBytes = Buffer.from(txBase64, "base64");
        return VersionedTransaction.deserialize(txBytes);
      },
    );

    // Send bundle using SDK helper
    const bundleId = await sendBundleAndConfirm(transactions, sdk);

    return NextResponse.json({
      bundleId,
      method: "jito_bundle",
    });
  } catch (error) {
    console.error("Error sending bundle:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send bundle";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
