import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import { 
  BagsSDK, 
  BAGS_FEE_SHARE_V2_MAX_CLAIMERS_NON_LUT,
  createTipTransaction,
} from "@bagsfm/bags-sdk";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://mainnet.helius-rpc.com";
const FALLBACK_JITO_TIP_LAMPORTS = 0.015 * LAMPORTS_PER_SOL;

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

// POST /api/agents/mint/fee-share - Create fee share config for agent token
export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get API key from environment
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 }
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
        { status: 400 }
      );
    }

    // Initialize Bags SDK
    const connection = new Connection(SOLANA_RPC_URL);
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    // Convert to PublicKeys
    const walletPubkey = new PublicKey(wallet);
    const tokenMintPubkey = new PublicKey(tokenMint);

    // Creator gets 100% of fees
    const feeClaimers = [{ user: walletPubkey, userBps: 10000 }];

    // Check if lookup tables are needed (when there are more than MAX_CLAIMERS_NON_LUT claimers)
    // Currently we only support single fee claimer, but this is here for future multi-claimer support
    const lutTransactions: Array<{ transaction: string; type: string }> = [];
    let additionalLookupTables: PublicKey[] | undefined;

    if (feeClaimers.length > BAGS_FEE_SHARE_V2_MAX_CLAIMERS_NON_LUT) {
      console.log(`[Fee Share] Creating lookup tables for ${feeClaimers.length} fee claimers (exceeds ${BAGS_FEE_SHARE_V2_MAX_CLAIMERS_NON_LUT} limit)...`);
      
      // Get LUT creation transactions
      const lutResult = await sdk.config.getConfigCreationLookupTableTransactions({
        payer: walletPubkey,
        baseMint: tokenMintPubkey,
        feeClaimers: feeClaimers,
      });

      if (!lutResult) {
        throw new Error("Failed to create lookup table transactions");
      }

      // Add creation transaction
      lutTransactions.push({
        transaction: Buffer.from(lutResult.creationTransaction.serialize()).toString("base64"),
        type: "lut_creation",
      });

      // Add extend transactions
      for (const extendTx of lutResult.extendTransactions) {
        lutTransactions.push({
          transaction: Buffer.from(extendTx.serialize()).toString("base64"),
          type: "lut_extend",
        });
      }

      additionalLookupTables = lutResult.lutAddresses;
      console.log(`[Fee Share] LUT transactions created: ${lutTransactions.length}`);
    }

    // Build config options
    const configOptions: {
      payer: PublicKey;
      baseMint: PublicKey;
      feeClaimers: Array<{ user: PublicKey; userBps: number }>;
      partner?: PublicKey;
      partnerConfig?: PublicKey;
      additionalLookupTables?: PublicKey[];
    } = {
      payer: walletPubkey,
      baseMint: tokenMintPubkey,
      feeClaimers,
      additionalLookupTables,
    };

    // Add partner configuration if both are set
    if (partnerWallet && partnerConfig) {
      configOptions.partner = new PublicKey(partnerWallet);
      configOptions.partnerConfig = new PublicKey(partnerConfig);
      console.log(`[Fee Share] Using partner config: ${partnerConfig}`);
    }


    // Create fee share config using SDK
    let configResult;

    console.log("[Fee Share] Creating config with SDK...");
    console.log("[Fee Share] Config options:", {configOptions
    });
    try {
      configResult = await sdk.config.createBagsFeeShareConfig(configOptions);
    } catch (sdkError: unknown) {
      console.error("[Fee Share] SDK Error details:", sdkError);
      // Try to extract more error details
      if (sdkError && typeof sdkError === 'object' && 'data' in sdkError) {
        console.error("[Fee Share] Error data:", JSON.stringify((sdkError as { data: unknown }).data, null, 2));
      }
      throw sdkError;
    }

    console.log("[Fee Share] Config created successfully");
    console.log("[Fee Share] Meteora config key:", configResult.meteoraConfigKey.toString());

    // Convert transactions to base64 for frontend signing
    const transactions = (configResult.transactions || []).map((tx) => ({
      transaction: Buffer.from(tx.serialize()).toString("base64"),
    }));

    // Get recommended Jito tip for bundles
    let jitoTipLamports = FALLBACK_JITO_TIP_LAMPORTS;
    try {
      const recommendedTip = await sdk.solana.getJitoRecentFees();
      if (recommendedTip?.landed_tips_95th_percentile) {
        jitoTipLamports = Math.floor(recommendedTip.landed_tips_95th_percentile * LAMPORTS_PER_SOL);
      }
    } catch {
      console.log("[Fee Share] Using fallback Jito tip");
    }

    // Convert bundles to base64 and include tip transactions
    const commitment = sdk.state.getCommitment();
    const bundles = await Promise.all((configResult.bundles || []).map(async (bundle) => {
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
            { blockhash: bundleBlockhash }
          );
        } catch (tipError) {
          console.error("[Fee Share] Failed to create tip transaction:", tipError);
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
            transaction: Buffer.from(tipTransaction.serialize()).toString("base64"),
            isTip: true,
            tipLamports: jitoTipLamports,
          },
          ...bundleTxs,
        ];
      }

      return bundleTxs;
    }));

    return NextResponse.json({
      needsCreation: transactions.length > 0 || bundles.length > 0 || lutTransactions.length > 0,
      needsLutSetup: lutTransactions.length > 0,
      feeShareAuthority: walletPubkey.toString(),
      meteoraConfigKey: configResult.meteoraConfigKey.toString(),
      lutTransactions, // LUT transactions must be sent first, with a slot wait between creation and extend
      transactions,
      bundles,
    });
  } catch (error) {
    console.error("Error creating fee share config:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create fee share config";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
