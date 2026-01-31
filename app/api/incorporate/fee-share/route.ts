import { NextResponse } from "next/server";

const BAGS_API_BASE = "https://public-api-v2.bags.fm/api/v1";

// POST /api/incorporate/fee-share - Create fee share config on Bags
export async function POST(request: Request) {
  try {
    // Get API key from environment
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { wallet, tokenMint } = body;

    // Validate required fields
    if (!wallet || !tokenMint) {
      return NextResponse.json(
        { error: "Missing required fields: wallet, tokenMint" },
        { status: 400 }
      );
    }

    // For now, creator gets 100% of fees
    // In the future, this could distribute fees among the selected agents' creators
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
    // This may include transactions that need to be signed
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
