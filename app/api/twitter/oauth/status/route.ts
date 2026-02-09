/**
 * Twitter OAuth Status
 * Check if user has connected their Twitter account
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!isAuthResult(authResult)) return authResult;

  // Rate limit: 20 requests per minute per user
  const rateLimited = await rateLimitByUser(
    authResult.userId,
    "twitter-status",
    20,
  );
  if (rateLimited) return rateLimited;

  try {
    // Get user's Twitter connection status
    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      select: {
        twitterAccessToken: true,
        twitterUsername: true,
        twitterUserId: true,
        twitterConnectedAt: true,
        twitterTokenExpiresAt: true,
      },
    });

    const isConnected = !!(user?.twitterAccessToken && user?.twitterUsername);

    return NextResponse.json({
      connected: isConnected,
      username: user?.twitterUsername,
      userId: user?.twitterUserId,
      connectedAt: user?.twitterConnectedAt,
      tokenExpiresAt: user?.twitterTokenExpiresAt,
    });
  } catch (error) {
    console.error("[Twitter Status] Check error:", error);
    return NextResponse.json(
      { error: "Failed to check Twitter connection status" },
      { status: 500 },
    );
  }
}
