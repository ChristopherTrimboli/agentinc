import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireAuth,
  isAuthResult,
  getPrivyClient,
} from "@/lib/auth/verifyRequest";
import {
  isServerWalletConfigured,
  createServerOwnedWallet,
} from "@/lib/privy/wallet-service";
import { rateLimitByUser } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Use requireAuth to verify the token — this caches the userId in Redis,
  // avoiding a redundant Privy API call on every page load.
  const authResult = await requireAuth(req);
  if (!isAuthResult(authResult)) return authResult;

  const { userId } = authResult;

  // Rate limit: 10 sync requests per minute per user
  const rateLimited = await rateLimitByUser(userId, "user-sync", 10);
  if (rateLimited) return rateLimited;

  try {
    // Fetch full Privy user object for linked_accounts (email, etc.).
    // Auth is already verified by requireAuth above; this call is data-only.
    const idToken = req.headers.get("privy-id-token")!;
    const privy = getPrivyClient();
    const privyUser = await privy.users().get({ id_token: idToken });

    // Extract email from linked_accounts
    const emailAccount = privyUser.linked_accounts?.find(
      (account) => account.type === "email",
    ) as { type: "email"; address: string } | undefined;

    // Get existing user to check if they already have wallets
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        activeWalletId: true,
        wallets: true,
      },
    });

    // Upsert user record
    const user = await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: emailAccount?.address ?? null,
      },
      update: {
        email: emailAccount?.address ?? null,
      },
      select: {
        id: true,
        email: true,
        activeWalletId: true,
        twitterUserId: true,
        twitterUsername: true,
        twitterConnectedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Ensure user has a server-owned wallet
    if (isServerWalletConfigured()) {
      const hasServerOwnedWallet = existingUser?.wallets?.some(
        (w) => w.serverOwned,
      );

      if (!hasServerOwnedWallet) {
        // New user with no wallets, OR existing user with only legacy user-owned wallets.
        // Create a fresh server-owned wallet so the server has full control.
        try {
          const { walletId, address } = await createServerOwnedWallet();

          const wallet = await prisma.userWallet.create({
            data: {
              userId,
              privyWalletId: walletId,
              address,
              serverOwned: true,
              label: "Primary",
            },
          });

          // Set the new server-owned wallet as active (replaces legacy wallet)
          await prisma.user.update({
            where: { id: userId },
            data: { activeWalletId: wallet.id },
          });

          console.log(
            `[UserSync] Created server-owned wallet for user ${userId}: ${address}`,
          );
        } catch (error) {
          console.error(
            "[UserSync] Failed to create server-owned wallet:",
            error,
          );
          // Non-fatal — user can still use legacy wallet, retry on next sync
        }
      }
    }

    // Ensure active wallet is set and points to a server-owned wallet if available.
    // This handles: no active wallet, or active wallet is a legacy user-owned one.
    if (existingUser?.wallets?.length) {
      const activeWallet = existingUser.wallets.find(
        (w) => w.id === existingUser.activeWalletId,
      );
      const serverWallet = existingUser.wallets.find((w) => w.serverOwned);

      const shouldSwitch =
        !existingUser.activeWalletId ||
        (activeWallet && !activeWallet.serverOwned && serverWallet);

      if (shouldSwitch && serverWallet) {
        await prisma.user.update({
          where: { id: userId },
          data: { activeWalletId: serverWallet.id },
        });
      }
    }

    return NextResponse.json({
      success: true,
      user,
      serverWalletConfigured: isServerWalletConfigured(),
    });
  } catch (error) {
    console.error("User sync error:", error);
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
  }
}
