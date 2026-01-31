import { NextResponse } from "next/server";

const BAGS_API_BASE = "https://public-api-v2.bags.fm/api/v1";

// POST /api/incorporate/launch - Create token launch transaction
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
    const { tokenMint, metadataUrl, wallet, initialBuyLamports, configKey } = body;

    // Validate required fields
    if (!tokenMint || !metadataUrl || !wallet || !configKey) {
      return NextResponse.json(
        { error: "Missing required fields: tokenMint, metadataUrl, wallet, configKey" },
        { status: 400 }
      );
    }

    // Call Bags API to create launch transaction
    const response = await fetch(`${BAGS_API_BASE}/token-launch/create-launch-transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        ipfs: metadataUrl,
        tokenMint,
        wallet,
        initialBuyLamports: initialBuyLamports || 0,
        configKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Bags API error:", errorData);
      return NextResponse.json(
        { error: errorData.error || "Failed to create launch transaction" },
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

    // The response is a base58 encoded serialized transaction
    // Convert to base64 for easier handling in the frontend
    const transactionBase58 = data.response;
    
    // Decode base58 and re-encode as base64
    const bs58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let num = BigInt(0);
    for (const char of transactionBase58) {
      num = num * BigInt(58) + BigInt(bs58Chars.indexOf(char));
    }
    
    // Convert to bytes
    const bytes: number[] = [];
    while (num > 0) {
      bytes.unshift(Number(num % BigInt(256)));
      num = num / BigInt(256);
    }
    
    // Add leading zeros for leading '1's in base58
    for (const char of transactionBase58) {
      if (char === "1") bytes.unshift(0);
      else break;
    }
    
    const transactionBase64 = Buffer.from(bytes).toString("base64");

    return NextResponse.json({
      transaction: transactionBase64,
    });
  } catch (error) {
    console.error("Error creating launch transaction:", error);
    return NextResponse.json(
      { error: "Failed to create launch transaction" },
      { status: 500 }
    );
  }
}
