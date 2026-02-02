import { NextRequest, NextResponse } from "next/server";
import { BagsSDK } from "@bagsfm/bags-sdk";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { isValidPublicKey, validatePublicKey } from "@/lib/utils/validation";

// POST /api/earnings/positions - Get claimable fee positions for user's wallet
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  try {
    const body = await req.json();
    const { wallet } = body;

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
    const walletPubkey = validatePublicKey(wallet, "wallet");
    const positions = await sdk.fee.getAllClaimablePositions(walletPubkey);

    // Calculate total claimable amount in SOL
    let totalClaimableLamports = 0;
    const formattedPositions = positions.map((position) => {
      // Use totalClaimableLamportsUserShare from SDK
      const positionTotal = Number(
        position.totalClaimableLamportsUserShare || 0,
      );
      totalClaimableLamports += positionTotal;

      // Extract optional properties safely
      const pos = position as Record<string, unknown>;

      return {
        baseMint: position.baseMint,
        virtualPoolAddress: pos.virtualPoolAddress as string | undefined,
        dammPoolAddress: pos.dammPoolAddress as string | undefined,
        totalClaimable: positionTotal / LAMPORTS_PER_SOL,
        isCustomFeeVault: pos.isCustomFeeVault as boolean | undefined,
        isMigrated: pos.isMigrated as boolean | undefined,
      };
    });

    return NextResponse.json({
      wallet,
      positions: formattedPositions,
      totalClaimableSol: totalClaimableLamports / LAMPORTS_PER_SOL,
      positionCount: positions.length,
    });
  } catch (error) {
    console.error("[Earnings] Error fetching claimable positions:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch claimable positions";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
