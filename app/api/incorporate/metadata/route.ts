import { NextRequest, NextResponse } from "next/server";
import { BagsSDK } from "@bagsfm/bags-sdk";
import { put } from "@vercel/blob";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { getConnection } from "@/lib/constants/solana";
import { rateLimitByUser } from "@/lib/rateLimit";

// POST /api/incorporate/metadata - Create token info and metadata on Bags for corporation
export async function POST(request: NextRequest) {
  // Require authentication
  const auth = await requireAuth(request);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(
    auth.userId,
    "incorporate-metadata",
    10,
  );
  if (limited) return limited;

  try {
    // Get API key from environment
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { name, symbol, description, imageUrl, twitter, website, telegram } =
      body;

    // Validate required fields
    if (!name || !symbol || !description || !imageUrl) {
      return NextResponse.json(
        {
          error: "Missing required fields: name, symbol, description, imageUrl",
        },
        { status: 400 },
      );
    }

    if (name.length > 32) {
      return NextResponse.json(
        { error: "Name must be 32 characters or less" },
        { status: 400 },
      );
    }

    if (symbol.length > 10) {
      return NextResponse.json(
        { error: "Symbol must be 10 characters or less" },
        { status: 400 },
      );
    }

    if (description.length > 1000) {
      return NextResponse.json(
        { error: "Description must be 1000 characters or less" },
        { status: 400 },
      );
    }

    // Handle image - if it's a base64 data URL, upload to Vercel Blob first
    let publicImageUrl = imageUrl;

    if (imageUrl.startsWith("data:")) {
      // Extract base64 data and mime type from data URL
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json(
          { error: "Invalid image data URL format" },
          { status: 400 },
        );
      }
      const mimeType = matches[1];
      const base64Data = matches[2];

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, "base64");

      // Determine file extension from mime type
      const ext = mimeType.split("/")[1] || "png";
      const filename = `corporations/${Date.now()}-${symbol.toLowerCase()}.${ext}`;

      // Upload to Vercel Blob
      const { url } = await put(filename, imageBuffer, {
        access: "public",
        contentType: mimeType,
      });

      publicImageUrl = url;
    }

    // Initialize Bags SDK
    const connection = getConnection();
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    // Create token info and metadata using SDK (same as agent mint)
    const tokenInfoResponse = await sdk.tokenLaunch.createTokenInfoAndMetadata({
      imageUrl: publicImageUrl,
      name,
      symbol: symbol.toUpperCase().replace("$", ""),
      description,
      twitter: twitter || undefined,
      website: website || undefined,
      telegram: telegram || undefined,
    });

    return NextResponse.json({
      tokenMint: tokenInfoResponse.tokenMint,
      tokenMetadata: tokenInfoResponse.tokenMetadata,
      tokenLaunch: tokenInfoResponse.tokenLaunch,
    });
  } catch (error) {
    console.error("Error creating token metadata:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create token metadata";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
