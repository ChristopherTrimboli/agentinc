import { NextRequest, NextResponse } from "next/server";
import { BagsSDK } from "@bagsfm/bags-sdk";
import { Connection } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { isValidPublicKey, validatePublicKey } from "@/lib/utils/validation";
import { rateLimitByUser } from "@/lib/rateLimit";

// Reuse Connection and SDK instances across requests
let _connection: Connection | null = null;
let _sdk: BagsSDK | null = null;
let _sdkApiKey: string | null = null;

function getConnectionAndSDK(): {
  connection: Connection;
  sdk: BagsSDK;
} | null {
  const apiKey = process.env.BAGS_API_KEY;
  if (!apiKey) return null;

  if (!_connection) {
    _connection = new Connection(SOLANA_RPC_URL);
  }
  if (!_sdk || _sdkApiKey !== apiKey) {
    _sdk = new BagsSDK(apiKey, _connection, "confirmed");
    _sdkApiKey = apiKey;
  }

  return { connection: _connection, sdk: _sdk };
}

// POST /api/earnings/claim - Generate claim transactions for all positions or specific token
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  // Rate limit: 5 claim requests per minute per user
  const rateLimited = await rateLimitByUser(auth.userId, "earnings-claim", 5);
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const { wallet, tokenMint } = body; // wallet required, tokenMint optional

    if (!wallet || typeof wallet !== "string") {
      return NextResponse.json(
        { error: "Missing wallet address" },
        { status: 400 },
      );
    }

    // Validate wallet PublicKey
    if (!isValidPublicKey(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address: not a valid Solana public key" },
        { status: 400 },
      );
    }

    // Validate tokenMint if provided
    if (tokenMint && !isValidPublicKey(tokenMint)) {
      return NextResponse.json(
        { error: "Invalid tokenMint: not a valid Solana public key" },
        { status: 400 },
      );
    }

    const clients = getConnectionAndSDK();
    if (!clients) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 },
      );
    }

    const { sdk } = clients;

    // Get all claimable positions for the wallet
    const walletPubkey = validatePublicKey(wallet, "wallet");
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

    // Generate claim transactions for all positions in parallel
    const txResults = await Promise.all(
      positionsToProcess.map(async (position) => {
        try {
          const claimTxs = await sdk.fee.getClaimTransaction(
            walletPubkey,
            position,
          );

          if (claimTxs && claimTxs.length > 0) {
            return claimTxs.map((tx) => ({
              transaction: Buffer.from(
                tx.serialize({
                  requireAllSignatures: false,
                  verifySignatures: false,
                }),
              ).toString("base64"),
              tokenMint: position.baseMint,
            }));
          }
          return [];
        } catch (txError) {
          console.error(
            `[Earnings] Error generating claim tx for ${position.baseMint}:`,
            txError,
          );
          return [];
        }
      }),
    );

    for (const txs of txResults) {
      allTransactions.push(...txs);
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
