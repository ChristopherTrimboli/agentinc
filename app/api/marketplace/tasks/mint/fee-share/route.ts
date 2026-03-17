import { NextRequest, NextResponse } from "next/server";
import { BagsSDK, createTipTransaction } from "@bagsfm/bags-sdk";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { getConnection } from "@/lib/constants/solana";
import { isValidPublicKey, validatePublicKey } from "@/lib/utils/validation";
import { rateLimitByUser } from "@/lib/rateLimit";

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

    const treasuryAddress = process.env.SOL_TREASURY_ADDRESS;
    if (!treasuryAddress) {
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
    const { tokenMint } = body;

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
    const treasuryPubkey = new PublicKey(treasuryAddress);

    const partnerWallet = process.env.BAGS_PARTNER_WALLET;
    const partnerConfig = process.env.BAGS_PARTNER_KEY;

    const configOptions: {
      payer: PublicKey;
      baseMint: PublicKey;
      feeClaimers: Array<{ user: PublicKey; userBps: number }>;
      partner?: PublicKey;
      partnerConfig?: PublicKey;
    } = {
      payer: walletPubkey,
      baseMint: tokenMintPubkey,
      feeClaimers: [{ user: treasuryPubkey, userBps: 10000 }],
    };

    if (partnerWallet && partnerConfig) {
      configOptions.partner = new PublicKey(partnerWallet);
      configOptions.partnerConfig = new PublicKey(partnerConfig);
    }

    const configResult =
      await sdk.config.createBagsFeeShareConfig(configOptions);

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
    return NextResponse.json(
      { error: "Failed to create task token fee config" },
      { status: 500 },
    );
  }
}
