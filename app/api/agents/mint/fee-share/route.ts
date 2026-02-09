import { NextRequest, NextResponse } from "next/server";
import { BagsSDK, createTipTransaction } from "@bagsfm/bags-sdk";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { getConnection } from "@/lib/constants/solana";
import { isValidPublicKey, validatePublicKey } from "@/lib/utils/validation";
import { rateLimitByUser } from "@/lib/rateLimit";

const FALLBACK_JITO_TIP_LAMPORTS = 0.015 * LAMPORTS_PER_SOL;

// POST /api/agents/mint/fee-share - Create fee share config for agent token
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "mint-fee-share", 10);
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

    // Get partner configuration from environment
    const partnerWallet = process.env.BAGS_PARTNER_WALLET;
    const partnerConfig = process.env.BAGS_PARTNER_KEY;

    const body = await req.json();
    const { wallet, tokenMint } = body;

    // Validate required fields
    if (!wallet || !tokenMint) {
      return NextResponse.json(
        { error: "Missing required fields: wallet, tokenMint" },
        { status: 400 },
      );
    }

    // Validate PublicKeys before use
    if (!isValidPublicKey(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address: not a valid Solana public key" },
        { status: 400 },
      );
    }
    if (!isValidPublicKey(tokenMint)) {
      return NextResponse.json(
        { error: "Invalid tokenMint: not a valid Solana public key" },
        { status: 400 },
      );
    }

    // Initialize Bags SDK with pooled connection
    const connection = getConnection();
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    // Convert to PublicKeys (validated above)
    const walletPubkey = validatePublicKey(wallet, "wallet");
    const tokenMintPubkey = validatePublicKey(tokenMint, "tokenMint");

    // Creator gets 100% of fees (single claimer, no LUT needed)
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
    let configResult;

    try {
      configResult = await sdk.config.createBagsFeeShareConfig(configOptions);
    } catch (sdkError: unknown) {
      console.error("[Fee Share] SDK Error details:", sdkError);
      // Try to extract more error details
      if (sdkError && typeof sdkError === "object" && "data" in sdkError) {
        console.error(
          "[Fee Share] Error data:",
          JSON.stringify((sdkError as { data: unknown }).data, null, 2),
        );
      }
      throw sdkError;
    }

    // Convert transactions to base64 for frontend signing
    const transactions = (configResult.transactions || []).map((tx) => ({
      transaction: Buffer.from(tx.serialize()).toString("base64"),
    }));

    // Get recommended Jito tip for bundles
    let jitoTipLamports = FALLBACK_JITO_TIP_LAMPORTS;
    try {
      const recommendedTip = await sdk.solana.getJitoRecentFees();
      if (recommendedTip?.landed_tips_95th_percentile) {
        jitoTipLamports = Math.floor(
          recommendedTip.landed_tips_95th_percentile * LAMPORTS_PER_SOL,
        );
      }
    } catch {
      // Use fallback tip amount
    }

    // Convert bundles to base64 and include tip transactions
    const commitment = sdk.state.getCommitment();
    const bundles = await Promise.all(
      (configResult.bundles || []).map(async (bundle) => {
        // Get blockhash from first transaction in bundle
        const bundleBlockhash = bundle[0]?.message.recentBlockhash;

        // Create tip transaction with same blockhash
        let tipTransaction = null;
        if (bundleBlockhash) {
          try {
            tipTransaction = await createTipTransaction(
              connection,
              commitment,
              walletPubkey,
              jitoTipLamports,
              { blockhash: bundleBlockhash },
            );
          } catch (tipError) {
            console.error(
              "[Fee Share] Failed to create tip transaction:",
              tipError,
            );
          }
        }

        // Return tip transaction first (if created), then bundle transactions
        const bundleTxs = bundle.map((tx) => ({
          transaction: Buffer.from(tx.serialize()).toString("base64"),
          isTip: false,
        }));

        if (tipTransaction) {
          return [
            {
              transaction: Buffer.from(tipTransaction.serialize()).toString(
                "base64",
              ),
              isTip: true,
              tipLamports: jitoTipLamports,
            },
            ...bundleTxs,
          ];
        }

        return bundleTxs;
      }),
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
