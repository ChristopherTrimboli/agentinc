import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";

/**
 * Update signer status for user's wallet
 * Called by client after successfully adding server signer via useSigners().addSigners()
 */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!isAuthResult(authResult)) return authResult;

  // Rate limit: 10 requests per minute per user
  const rateLimited = await rateLimitByUser(
    authResult.userId,
    "signer-status",
    10,
  );
  if (rateLimited) return rateLimited;

  try {
    // Update signer status
    const user = await prisma.user.update({
      where: { id: authResult.userId },
      data: { walletSignerAdded: true },
    });

    return NextResponse.json({
      success: true,
      walletSignerAdded: user.walletSignerAdded,
    });
  } catch (error) {
    console.error("[Signer Status] Update error:", error);
    return NextResponse.json(
      { error: "Failed to update signer status" },
      { status: 500 },
    );
  }
}
