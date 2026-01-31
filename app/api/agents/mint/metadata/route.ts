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

// POST /api/agents/mint/metadata - Create token info and metadata on Bags for agent
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
    const { name, symbol, description, imageUrl, twitter, website, telegram } = body;

    // Validate required fields
    if (!name || !symbol || !description || !imageUrl) {
      return NextResponse.json(
        { error: "Missing required fields: name, symbol, description, imageUrl" },
        { status: 400 }
      );
    }

    if (name.length > 32) {
      return NextResponse.json(
        { error: "Name must be 32 characters or less" },
        { status: 400 }
      );
    }

    if (symbol.length > 10) {
      return NextResponse.json(
        { error: "Symbol must be 10 characters or less" },
        { status: 400 }
      );
    }

    if (description.length > 1000) {
      return NextResponse.json(
        { error: "Description must be 1000 characters or less" },
        { status: 400 }
      );
    }

    // Create form data for Bags API
    const formData = new FormData();
    formData.append("name", name);
    formData.append("symbol", symbol.toUpperCase().replace("$", ""));
    formData.append("description", description);
    formData.append("imageUrl", imageUrl);
    
    if (twitter) formData.append("twitter", twitter);
    if (website) formData.append("website", website);
    if (telegram) formData.append("telegram", telegram);

    // Call Bags API to create token info
    const response = await fetch(`${BAGS_API_BASE}/token-launch/create-token-info`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Bags API error:", errorData);
      return NextResponse.json(
        { error: errorData.error || "Failed to create token metadata" },
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

    return NextResponse.json({
      tokenMint: data.response.tokenMint,
      tokenMetadata: data.response.tokenMetadata,
      tokenLaunch: data.response.tokenLaunch,
    });
  } catch (error) {
    console.error("Error creating token metadata:", error);
    return NextResponse.json(
      { error: "Failed to create token metadata" },
      { status: 500 }
    );
  }
}
