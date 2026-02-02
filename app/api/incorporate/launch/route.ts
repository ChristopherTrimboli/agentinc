import { NextRequest, NextResponse } from "next/server";
import { BagsSDK } from "@bagsfm/bags-sdk";
import { Connection } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { isValidPublicKey, validatePublicKey } from "@/lib/utils/validation";

// POST /api/incorporate/launch - Create token launch transaction for corporation
export async function POST(request: NextRequest) {
  // Require authentication
  const auth = await requireAuth(request);
  if (!isAuthResult(auth)) return auth;

  try {
    // Get API key from environment
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { tokenMint, metadataUrl, wallet, initialBuyLamports, configKey } =
      body;

    // Validate required fields
    if (!tokenMint || !metadataUrl || !wallet || !configKey) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: tokenMint, metadataUrl, wallet, configKey",
        },
        { status: 400 },
      );
    }

    // Validate PublicKeys before use
    const invalidKeys: string[] = [];
    if (!isValidPublicKey(tokenMint)) invalidKeys.push("tokenMint");
    if (!isValidPublicKey(wallet)) invalidKeys.push("wallet");
    if (!isValidPublicKey(configKey)) invalidKeys.push("configKey");

    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `Invalid Solana public key(s): ${invalidKeys.join(", ")}` },
        { status: 400 },
      );
    }

    // Initialize Bags SDK
    const connection = new Connection(SOLANA_RPC_URL);
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    // Convert to PublicKeys (validated above)
    const tokenMintPubkey = validatePublicKey(tokenMint, "tokenMint");
    const walletPubkey = validatePublicKey(wallet, "wallet");
    const configKeyPubkey = validatePublicKey(configKey, "configKey");

    // Create launch transaction using SDK
    const launchTransaction = await sdk.tokenLaunch.createLaunchTransaction({
      metadataUrl,
      tokenMint: tokenMintPubkey,
      launchWallet: walletPubkey,
      initialBuyLamports: initialBuyLamports || 0,
      configKey: configKeyPubkey,
    });

    // Serialize the transaction to base64 for frontend signing
    const transactionBase64 = Buffer.from(
      launchTransaction.serialize(),
    ).toString("base64");

    return NextResponse.json({
      transaction: transactionBase64,
    });
  } catch (error) {
    console.error("Error creating launch transaction:", error);

    // Extract detailed error info from SDK errors
    let errorMessage = "Failed to create launch transaction";
    if (error && typeof error === "object") {
      const err = error as {
        message?: string;
        data?: unknown;
        status?: number;
      };
      if (err.data) {
        console.error(
          "[Launch] API Error data:",
          JSON.stringify(err.data, null, 2),
        );
        // Try to extract message from nested error data
        const data = err.data as { error?: string; message?: string };
        errorMessage =
          data.error || data.message || err.message || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
