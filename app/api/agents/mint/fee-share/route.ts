import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";

const BAGS_API_BASE = "https://public-api-v2.bags.fm/api/v1";

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

    const body = await req.json();
    const { wallet, tokenMint } = body;

    // Validate required fields
    if (!wallet || !tokenMint) {
      return NextResponse.json(
        { error: "Missing required fields: wallet, tokenMint" },
        { status: 400 }
      );
    }

    // Creator gets 100% of fees for minted agents
    const claimersArray = [wallet];
    const basisPointsArray = [10000]; // 100% to creator

    // Call Bags API to create fee share config
    const response = await fetch(`${BAGS_API_BASE}/fee-share/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        payer: wallet,
        baseMint: tokenMint,
        claimersArray,
        basisPointsArray,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Bags API error:", errorData);
      return NextResponse.json(
        { error: errorData.error || "Failed to create fee share config" },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.success || !data.response) {
      return NextResponse.json(
        { error: "Invalid response from Bags API" },
        { status: 500 }
      );
    }

    // Return the fee share config response
    return NextResponse.json({
      needsCreation: data.response.needsCreation,
      feeShareAuthority: data.response.feeShareAuthority,
      meteoraConfigKey: data.response.meteoraConfigKey,
      transactions: data.response.transactions || [],
      bundles: data.response.bundles || [],
    });
  } catch (error) {
    console.error("Error creating fee share config:", error);
    return NextResponse.json(
      { error: "Failed to create fee share config" },
      { status: 500 }
    );
  }
}
