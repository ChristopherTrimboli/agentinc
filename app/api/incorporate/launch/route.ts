import { NextResponse } from "next/server";
import { BagsSDK } from "@bagsfm/bags-sdk";
import { Connection, PublicKey } from "@solana/web3.js";

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://mainnet.helius-rpc.com";

// POST /api/incorporate/launch - Create token launch transaction
export async function POST(request: Request) {
  try {
    // Get API key from environment
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
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

    // Initialize Bags SDK
    const connection = new Connection(SOLANA_RPC_URL);
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    // Convert to PublicKeys
    const tokenMintPubkey = new PublicKey(tokenMint);
    const walletPubkey = new PublicKey(wallet);
    const configKeyPubkey = new PublicKey(configKey);

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
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create launch transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
