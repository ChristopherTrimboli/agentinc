import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import { BagsSDK } from "@bagsfm/bags-sdk";
import { Connection, PublicKey } from "@solana/web3.js";

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

// POST /api/earnings/claim - Generate claim transactions for all positions or specific token
export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { wallet, tokenMint } = body; // wallet required, tokenMint optional

    if (!wallet) {
      return NextResponse.json(
        { error: "Missing wallet address" },
        { status: 400 },
      );
    }

    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 },
      );
    }

    // Initialize Bags SDK
    const connection = new Connection(SOLANA_RPC_URL);
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    // Get all claimable positions for the wallet
    const walletPubkey = new PublicKey(wallet);
    const allPositions = await sdk.fee.getAllClaimablePositions(walletPubkey);

    if (allPositions.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        message: "No claimable positions found",
      });
    }

    // Filter positions if specific token requested
    const positionsToProcess = tokenMint
      ? allPositions.filter((p) => p.baseMint === tokenMint)
      : allPositions;

    if (positionsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        message: tokenMint
          ? `No claimable positions found for token ${tokenMint}`
          : "No claimable positions found",
      });
    }

    // Generate claim transactions for each position
    const allTransactions: Array<{
      transaction: string;
      tokenMint: string;
    }> = [];

    for (const position of positionsToProcess) {
      try {
        const claimTxs = await sdk.fee.getClaimTransaction(
          walletPubkey,
          position,
        );

        if (claimTxs && claimTxs.length > 0) {
          for (const tx of claimTxs) {
            // Serialize without requiring signatures - user will sign on frontend
            allTransactions.push({
              transaction: Buffer.from(
                tx.serialize({ requireAllSignatures: false, verifySignatures: false })
              ).toString("base64"),
              tokenMint: position.baseMint,
            });
          }
        }
      } catch (txError) {
        console.error(
          `[Earnings] Error generating claim tx for ${position.baseMint}:`,
          txError,
        );
        // Continue with other positions
      }
    }

    return NextResponse.json({
      success: true,
      transactions: allTransactions,
      positionsClaimed: positionsToProcess.length,
      transactionCount: allTransactions.length,
    });
  } catch (error) {
    console.error("[Earnings] Error generating claim transactions:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to generate claim transactions";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
