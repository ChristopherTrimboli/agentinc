import { NextRequest, NextResponse } from "next/server";
import { BagsSDK, createTipTransaction } from "@bagsfm/bags-sdk";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { getConnection } from "@/lib/constants/solana";
import { isValidPublicKey, validatePublicKey } from "@/lib/utils/validation";
import { rateLimitByUser } from "@/lib/rateLimit";

const FALLBACK_JITO_TIP_LAMPORTS = 0.015 * LAMPORTS_PER_SOL;

const VALID_PROVIDERS = new Set([
  "twitter",
  "kick",
  "github",
  "solana",
  "moltbook",
  "tiktok",
  "instagram",
]);

interface FeeEarnerInput {
  provider: string;
  username: string;
  bps: number;
}

// POST /api/agents/mint/fee-share - Create fee share config for agent token
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "mint-fee-share", 10);
  if (limited) return limited;

  try {
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 },
      );
    }

    const partnerWallet = process.env.BAGS_PARTNER_WALLET;
    const partnerConfig = process.env.BAGS_PARTNER_KEY;

    if (!auth.walletAddress) {
      return NextResponse.json(
        { error: "No active wallet found" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { tokenMint, feeEarners } = body as {
      tokenMint: string;
      feeEarners?: FeeEarnerInput[];
    };

    if (!tokenMint) {
      return NextResponse.json(
        { error: "Missing required field: tokenMint" },
        { status: 400 },
      );
    }

    if (!isValidPublicKey(tokenMint)) {
      return NextResponse.json(
        { error: "Invalid tokenMint: not a valid Solana public key" },
        { status: 400 },
      );
    }

    // Validate fee earners if provided
    if (feeEarners && feeEarners.length > 0) {
      if (feeEarners.length > 99) {
        return NextResponse.json(
          { error: "Maximum 99 fee earners (plus creator = 100 total)" },
          { status: 400 },
        );
      }

      const totalEarnerBps = feeEarners.reduce((sum, e) => sum + e.bps, 0);
      if (totalEarnerBps >= 10000) {
        return NextResponse.json(
          { error: "Fee earner shares cannot total 100% — creator must keep some share" },
          { status: 400 },
        );
      }

      for (const earner of feeEarners) {
        if (!earner.username?.trim()) {
          return NextResponse.json(
            { error: "All fee earners must have a username" },
            { status: 400 },
          );
        }
        if (!VALID_PROVIDERS.has(earner.provider)) {
          return NextResponse.json(
            { error: `Invalid provider: ${earner.provider}` },
            { status: 400 },
          );
        }
        if (earner.bps <= 0 || earner.bps > 9999) {
          return NextResponse.json(
            { error: `Invalid bps for ${earner.username}: must be 1-9999` },
            { status: 400 },
          );
        }
      }
    }

    const connection = getConnection();
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    const walletPubkey = validatePublicKey(auth.walletAddress, "wallet");
    const tokenMintPubkey = validatePublicKey(tokenMint, "tokenMint");

    // Build fee claimers array — resolve social identities to wallets
    const feeClaimers: Array<{ user: PublicKey; userBps: number }> = [];

    if (feeEarners && feeEarners.length > 0) {
      const totalEarnerBps = feeEarners.reduce((sum, e) => sum + e.bps, 0);
      const creatorBps = 10000 - totalEarnerBps;

      // Creator always gets their explicit share first
      feeClaimers.push({ user: walletPubkey, userBps: creatorBps });

      // Resolve each fee earner's wallet
      for (const earner of feeEarners) {
        try {
          if (earner.provider === "solana") {
            if (!isValidPublicKey(earner.username)) {
              return NextResponse.json(
                { error: `Invalid Solana address for fee earner: ${earner.username}` },
                { status: 400 },
              );
            }
            feeClaimers.push({
              user: new PublicKey(earner.username),
              userBps: earner.bps,
            });
          } else {
            const walletResult = await sdk.state.getLaunchWalletV2(
              earner.username.trim(),
              earner.provider as "twitter" | "kick" | "github",
            );
            feeClaimers.push({
              user: walletResult.wallet,
              userBps: earner.bps,
            });
          }
        } catch (lookupError) {
          console.error(
            `[Fee Share] Failed to resolve wallet for ${earner.provider}:${earner.username}:`,
            lookupError,
          );
          return NextResponse.json(
            {
              error: `Could not find Bags wallet for @${earner.username} on ${earner.provider}. They may need to create an account on bags.fm first.`,
            },
            { status: 400 },
          );
        }
      }
    } else {
      // Creator gets 100% of fees (single claimer)
      feeClaimers.push({ user: walletPubkey, userBps: 10000 });
    }

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
