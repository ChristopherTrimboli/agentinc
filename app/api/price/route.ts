import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

// SOL mint address
const SOL_MINT = "So11111111111111111111111111111111111111112";

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

// GET /api/price - Get SOL price from Jupiter
export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get token mint from query params, default to SOL
    const { searchParams } = new URL(req.url);
    const mint = searchParams.get("mint") || SOL_MINT;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const jupiterApiKey = process.env.JUPITER_API_KEY;
    if (jupiterApiKey) {
      headers["x-api-key"] = jupiterApiKey;
    }

    const response = await fetch(`https://api.jup.ag/price/v2?ids=${mint}`, {
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch price from Jupiter" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const price = data.data?.[mint]?.price;

    return NextResponse.json({
      mint,
      price: price ? parseFloat(price) : null,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error fetching price:", error);
    return NextResponse.json(
      { error: "Failed to fetch price" },
      { status: 500 }
    );
  }
}
