import { NextRequest, NextResponse } from "next/server";
import { BagsSDK } from "@bagsfm/bags-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";

// Helper to safely create PublicKey
function isValidPublicKey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

// POST /api/incorporate/fee-share - Create fee share config on Bags
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

    // Get partner configuration from environment
    const partnerWallet = process.env.BAGS_PARTNER_WALLET;
    const partnerConfig = process.env.BAGS_PARTNER_KEY;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { wallet, tokenMint } = body;

    // Validate required fields
    if (!wallet || !tokenMint) {
      return NextResponse.json(
        { error: "Missing required fields: wallet, tokenMint" },
        { status: 400 },
      );
    }

    // Validate PublicKey formats
    if (!isValidPublicKey(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 },
      );
    }
    if (!isValidPublicKey(tokenMint)) {
      return NextResponse.json(
        { error: "Invalid tokenMint address" },
        { status: 400 },
      );
    }

    // Initialize Bags SDK
    const connection = new Connection(SOLANA_RPC_URL);
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    // Convert to PublicKeys (safe after validation)
    const walletPubkey = new PublicKey(wallet);
    const tokenMintPubkey = new PublicKey(tokenMint);

    // Creator gets 100% of fees
    const feeClaimers = [{ user: walletPubkey, userBps: 10000 }];

    // Build config options
    const configOptions: {
      payer: PublicKey;
      baseMint: PublicKey;
      feeClaimers: Array<{ user: PublicKey; userBps: number }>;
      partner?: PublicKey;
      partnerConfig?: PublicKey;
    } = {
      payer: walletPubkey,
      baseMint: tokenMintPubkey,
      feeClaimers,
    };

    // Add partner configuration if both are set
    if (partnerWallet && partnerConfig) {
      configOptions.partner = new PublicKey(partnerWallet);
      configOptions.partnerConfig = new PublicKey(partnerConfig);
    }

    // Create fee share config using SDK
    const configResult =
      await sdk.config.createBagsFeeShareConfig(configOptions);

    // Convert transactions to base64 for frontend signing
    const transactions = (configResult.transactions || []).map((tx) => ({
      transaction: Buffer.from(tx.serialize()).toString("base64"),
    }));

    const bundles = (configResult.bundles || []).map((bundle) =>
      bundle.map((tx) => ({
        transaction: Buffer.from(tx.serialize()).toString("base64"),
      })),
    );

    return NextResponse.json({
      needsCreation: transactions.length > 0 || bundles.length > 0,
      feeShareAuthority: walletPubkey.toString(),
      meteoraConfigKey: configResult.meteoraConfigKey.toString(),
      transactions,
      bundles,
    });
  } catch (error) {
    console.error("Error creating fee share config:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create fee share config";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
