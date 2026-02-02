import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import { BagsSDK, sendBundleAndConfirm } from "@bagsfm/bags-sdk";
import { Connection, VersionedTransaction } from "@solana/web3.js";

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://mainnet.helius-rpc.com";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

// Helper to verify auth
async function verifyAuth(req: NextRequest): Promise<string | null> {
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) return null;

  try {
    const privyUser = await privy.users().get({ id_token: idToken });
    return privyUser.id;
  } catch {
    return null;
  }
}

// POST /api/agents/mint/send-bundle - Send a signed bundle via Jito using SDK
export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    const connection = new Connection(SOLANA_RPC_URL);
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    // Deserialize transactions
    const transactions: VersionedTransaction[] = signedTransactions.map(
      (txBase64: string) => {
        const txBytes = Buffer.from(txBase64, "base64");
        return VersionedTransaction.deserialize(txBytes);
      },
    );

    console.log(
      `[Send Bundle] Sending ${transactions.length} transactions via Jito...`,
    );

    // Send bundle using SDK helper
    const bundleId = await sendBundleAndConfirm(transactions, sdk);

    console.log(`[Send Bundle] Bundle confirmed! Bundle ID: ${bundleId}`);

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
