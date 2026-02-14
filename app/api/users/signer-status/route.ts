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
    // Update legacy signer status on User model
    const user = await prisma.user.update({
      where: { id: authResult.userId },
      data: { walletSignerAdded: true },
      select: { walletSignerAdded: true, activeWalletId: true },
    });

    // Also update the active UserWallet's signerAdded flag
    // This keeps the new multi-wallet system in sync with the legacy field
    if (user.activeWalletId) {
      await prisma.userWallet
        .update({
          where: { id: user.activeWalletId },
          data: { signerAdded: true },
        })
        .catch((err) =>
          console.warn(
            "[Signer Status] Failed to update UserWallet.signerAdded:",
            err,
          ),
        );
    }

    // Also update any UserWallet matching the auth wallet address
    // (covers cases where activeWalletId isn't set yet)
    if (authResult.walletAddress) {
      await prisma.userWallet
        .updateMany({
          where: {
            userId: authResult.userId,
            address: authResult.walletAddress,
          },
          data: { signerAdded: true },
        })
        .catch((err) =>
          console.warn(
            "[Signer Status] Failed to update UserWallet by address:",
            err,
          ),
        );
    }

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
