import { NextRequest, NextResponse } from "next/server";

import {
  requireAuth,
  isAuthResult,
  getPrivyClient,
} from "@/lib/auth/verifyRequest";
import {
  getAuthorizationContext,
  getAuthorizationPublicKey,
} from "@/lib/privy/wallet-service";
import { rateLimitByUser } from "@/lib/rateLimit";
import prisma from "@/lib/prisma";

// POST /api/users/wallet/export - Export private key for the active server-owned wallet
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!isAuthResult(authResult)) return authResult;

  // Strict rate limit — 3 exports per minute (highly sensitive operation)
  const rateLimited = await rateLimitByUser(
    authResult.userId,
    "wallet-export",
    3,
  );
  if (rateLimited) return rateLimited;

  try {
    if (!authResult.walletId) {
      return NextResponse.json(
        { error: "No active wallet found" },
        { status: 400 },
      );
    }

    const wallet = await prisma.userWallet.findFirst({
      where: {
        userId: authResult.userId,
        privyWalletId: authResult.walletId,
      },
      select: { serverOwned: true },
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    if (!wallet.serverOwned) {
      // Legacy user-owned wallet — client must use Privy's exportWallet() React hook
      return NextResponse.json({ error: "use_client_export" }, { status: 400 });
    }

    const privy = getPrivyClient();
    const authContext = getAuthorizationContext();

    try {
      const { private_key } = await privy
        .wallets()
        .export(authResult.walletId, {
          authorization_context: authContext,
        });
      return NextResponse.json({ privateKey: private_key });
    } catch (exportError) {
      // Auto-heal wallets created without an owner (created before owner param was added).
      // Set the authorization key as owner, then retry the export.
      const msg =
        exportError instanceof Error
          ? exportError.message
          : String(exportError);
      if (msg.includes("must have an owner")) {
        console.log(
          `[Wallet Export] Wallet ${authResult.walletId} has no owner — setting auth key as owner and retrying`,
        );

        const publicKey = getAuthorizationPublicKey();
        await privy.wallets().update(authResult.walletId, {
          owner: { public_key: publicKey },
        });

        // Retry export now that the owner is set
        const { private_key } = await privy
          .wallets()
          .export(authResult.walletId, {
            authorization_context: authContext,
          });
        return NextResponse.json({ privateKey: private_key });
      }

      throw exportError;
    }
  } catch (error) {
    console.error("[Wallet Export] Error:", error);
    return NextResponse.json(
      { error: "Failed to export wallet private key" },
      { status: 500 },
    );
  }
}
