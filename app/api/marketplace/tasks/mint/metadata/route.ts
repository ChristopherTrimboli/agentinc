import { NextRequest, NextResponse } from "next/server";
import { BagsSDK } from "@bagsfm/bags-sdk";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { getConnection } from "@/lib/constants/solana";
import { rateLimitByUser } from "@/lib/rateLimit";
import { APP_BASE_URL } from "@/lib/constants/mint";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "task-mint-metadata", 10);
  if (limited) return limited;

  try {
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const { name, symbol, description, taskId } = body;

    if (
      !name ||
      typeof name !== "string" ||
      !symbol ||
      typeof symbol !== "string" ||
      !description ||
      typeof description !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing required fields: name, symbol, description" },
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

    // Verify task ownership if taskId provided
    if (taskId && typeof taskId === "string") {
      const task = await prisma.marketplaceTask.findUnique({
        where: { id: taskId },
        select: { posterId: true },
      });
      if (task && task.posterId !== auth.userId) {
        return NextResponse.json(
          { error: "You can only create metadata for your own tasks" },
          { status: 403 },
        );
      }
    }

    const connection = getConnection();
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    const sanitizedTaskId =
      typeof taskId === "string" ? taskId.replace(/[^a-zA-Z0-9_-]/g, "") : null;
    const websiteUrl = sanitizedTaskId
      ? `${APP_BASE_URL}/dashboard/marketplace/tasks/${sanitizedTaskId}`
      : `${APP_BASE_URL}/dashboard/marketplace`;

    const safeName = name
      .replace(/[\x00-\x1F\x7F]/g, "")
      .trim()
      .slice(0, 32);
    const safeSymbol = symbol
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10);
    const safeDescription = description
      .replace(/[\x00-\x1F\x7F]/g, "")
      .trim()
      .slice(0, 1000);

    const tokenInfoResponse = await sdk.tokenLaunch.createTokenInfoAndMetadata({
      imageUrl: `${APP_BASE_URL}/logo.png`,
      name: safeName,
      symbol: safeSymbol,
      description: safeDescription,
      website: websiteUrl,
    });

    return NextResponse.json({
      tokenMint: tokenInfoResponse.tokenMint,
      tokenMetadata: tokenInfoResponse.tokenMetadata,
      tokenLaunch: tokenInfoResponse.tokenLaunch,
    });
  } catch (error) {
    console.error("[Task Token Metadata] Error:", error);
    return NextResponse.json(
      { error: "Failed to create task token metadata" },
      { status: 500 },
    );
  }
}
