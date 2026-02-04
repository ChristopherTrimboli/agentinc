/**
 * Twitter OAuth Disconnect
 * Removes Twitter connection for a user
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verifyRequest";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Remove Twitter credentials from database
    await prisma.user.update({
      where: { id: auth.userId },
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
    console.error("Twitter disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Twitter account" },
      { status: 500 },
    );
  }
}
