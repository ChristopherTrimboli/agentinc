/**
 * Twitter OAuth Disconnect
 * Removes Twitter connection for a user
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!isAuthResult(authResult)) return authResult;

  // Rate limit: 5 requests per minute per user
  const rateLimited = await rateLimitByUser(
    authResult.userId,
    "twitter-disconnect",
    5,
  );
  if (rateLimited) return rateLimited;

  try {
    // Remove Twitter credentials from database
    await prisma.user.update({
      where: { id: authResult.userId },
      data: {
        twitterAccessToken: null,
        twitterRefreshToken: null,
        twitterTokenExpiresAt: null,
        twitterUserId: null,
        twitterUsername: null,
        twitterConnectedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Twitter account disconnected successfully",
    });
  } catch (error) {
    console.error("[Twitter Disconnect] Error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Twitter account" },
      { status: 500 },
    );
  }
}
