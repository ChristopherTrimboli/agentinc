import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import { BagsSDK } from "@bagsfm/bags-sdk";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

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

// POST /api/earnings/positions - Get claimable fee positions for user's wallet
export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { wallet } = body;

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
    const positions = await sdk.fee.getAllClaimablePositions(walletPubkey);

    // Calculate total claimable amount in SOL
    let totalClaimableLamports = 0;
    const formattedPositions = positions.map((position) => {
      // Sum up all claimable amounts
      const virtualPoolAmount = Number(
        position.virtualPoolClaimableLamportsUserShare ||
          position.virtualPoolClaimableAmount ||
          0,
      );
      const dammPoolAmount = Number(
        position.dammPoolClaimableLamportsUserShare ||
          position.dammPoolClaimableAmount ||
          0,
      );

      const positionTotal = virtualPoolAmount + dammPoolAmount;
      totalClaimableLamports += positionTotal;

      return {
        baseMint: position.baseMint,
        virtualPoolAddress: position.virtualPoolAddress,
        dammPoolAddress: position.dammPoolAddress,
        virtualPoolClaimable: virtualPoolAmount / LAMPORTS_PER_SOL,
        dammPoolClaimable: dammPoolAmount / LAMPORTS_PER_SOL,
        totalClaimable: positionTotal / LAMPORTS_PER_SOL,
        isCustomFeeVault: position.isCustomFeeVault,
        isMigrated: position.isMigrated,
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
