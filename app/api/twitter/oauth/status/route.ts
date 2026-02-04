/**
 * Twitter OAuth Status
 * Check if user has connected their Twitter account
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verifyRequest";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Twitter connection status
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
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
    console.error("Twitter status check error:", error);
    return NextResponse.json(
      { error: "Failed to check Twitter connection status" },
      { status: 500 },
    );
  }
}
