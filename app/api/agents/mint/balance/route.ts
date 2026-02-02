import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://mainnet.helius-rpc.com";

// POST /api/agents/mint/balance - Check wallet SOL balance
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  try {
    const body = await req.json();
    const { wallet } = body;

    if (!wallet) {
      return NextResponse.json(
        { error: "Missing wallet address" },
        { status: 400 },
      );
    }

    const connection = new Connection(SOLANA_RPC_URL);
    const walletPubkey = new PublicKey(wallet);

    const balanceLamports = await connection.getBalance(walletPubkey);
    const balanceSol = balanceLamports / LAMPORTS_PER_SOL;

    return NextResponse.json({
      balanceLamports,
      balanceSol,
    });
  } catch (error) {
    console.error("Error checking balance:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to check balance";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
