import { NextRequest, NextResponse } from "next/server";
import { BagsSDK } from "@bagsfm/bags-sdk";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { getConnection } from "@/lib/constants/solana";
import { isValidPublicKey, validatePublicKey } from "@/lib/utils/validation";
import { rateLimitByUser } from "@/lib/rateLimit";

// POST /api/agents/mint/launch - Create token launch transaction for agent
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "mint-launch", 10);
  if (limited) return limited;

  try {
    // Get API key from environment
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 },
      );
    }

    const body = await req.json();
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

    // Initialize Bags SDK with pooled connection
    const connection = getConnection();
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
    console.error("[Mint Launch] Error creating launch transaction:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create launch transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
