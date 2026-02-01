import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://mainnet.helius-rpc.com";

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

// POST /api/agents/mint/balance - Check wallet SOL balance
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
        { status: 400 }
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
    const errorMessage = error instanceof Error ? error.message : "Failed to check balance";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
