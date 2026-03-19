import { NextRequest, NextResponse } from "next/server";
import { BagsSDK, createTipTransaction } from "@bagsfm/bags-sdk";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { getConnection } from "@/lib/constants/solana";
import { isValidPublicKey, validatePublicKey } from "@/lib/utils/validation";
import { rateLimitByUser } from "@/lib/rateLimit";
import { TREASURY_ADDRESS } from "@/lib/x402/config";

const FALLBACK_JITO_TIP_LAMPORTS = 0.015 * LAMPORTS_PER_SOL;

/**
 * Configure fee share for a task token so 100% of creator fees
 * go to the treasury wallet. On task completion, fees are claimed
 * and forwarded to the worker.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "task-mint-fee-share", 10);
  if (limited) return limited;

  try {
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 },
      );
    }

    if (!TREASURY_ADDRESS) {
      return NextResponse.json(
        { error: "Treasury not configured" },
        { status: 500 },
      );
    }

    if (!auth.walletAddress) {
      return NextResponse.json(
        { error: "No active wallet found" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { tokenMint, bagsConfigType } = body;

    if (!tokenMint || !isValidPublicKey(tokenMint)) {
      return NextResponse.json(
        { error: "Invalid or missing tokenMint" },
        { status: 400 },
      );
    }

    const connection = getConnection();
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    const walletPubkey = validatePublicKey(auth.walletAddress, "wallet");
    const tokenMintPubkey = validatePublicKey(tokenMint, "tokenMint");
    const treasuryPubkey = validatePublicKey(TREASURY_ADDRESS, "treasury");

    const partnerWallet = process.env.BAGS_PARTNER_WALLET;
    const partnerConfig = process.env.BAGS_PARTNER_KEY;

    const configOptions: Parameters<
      typeof sdk.config.createBagsFeeShareConfig
    >[0] = {
      payer: walletPubkey,
      baseMint: tokenMintPubkey,
      feeClaimers: [{ user: treasuryPubkey, userBps: 10000 }],
    };

    if (partnerWallet && partnerConfig) {
      configOptions.partner = new PublicKey(partnerWallet);
      configOptions.partnerConfig = new PublicKey(partnerConfig);
    }

    if (bagsConfigType) {
      configOptions.bagsConfigType = bagsConfigType as typeof configOptions.bagsConfigType;
    }

    let configResult;
    try {
      configResult = await sdk.config.createBagsFeeShareConfig(configOptions);
    } catch (sdkError: unknown) {
      console.error("[Task Token Fee Share] SDK Error details:", sdkError);
      if (sdkError && typeof sdkError === "object" && "data" in sdkError) {
        console.error(
          "[Task Token Fee Share] Error data:",
          JSON.stringify((sdkError as { data: unknown }).data, null, 2),
        );
      }
      throw sdkError;
    }

    const transactions = (configResult.transactions || []).map((tx) => ({
      transaction: Buffer.from(tx.serialize()).toString("base64"),
    }));

    let jitoTipLamports = FALLBACK_JITO_TIP_LAMPORTS;
    try {
      const recommendedTip = await sdk.solana.getJitoRecentFees();
      if (recommendedTip?.landed_tips_95th_percentile) {
        jitoTipLamports = Math.floor(
          recommendedTip.landed_tips_95th_percentile * LAMPORTS_PER_SOL,
        );
      }
    } catch {
      // Use fallback
    }

    const commitment = sdk.state.getCommitment();
    const bundles = await Promise.all(
      (configResult.bundles || []).map(async (bundle) => {
        const bundleBlockhash = bundle[0]?.message.recentBlockhash;

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
            console.error("[Task Token Fee Share] Tip tx failed:", tipError);
          }
        }

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
      meteoraConfigKey: configResult.meteoraConfigKey.toString(),
      transactions,
      bundles,
    });
  } catch (error) {
    console.error("[Task Token Fee Share] Error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create task token fee config";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
