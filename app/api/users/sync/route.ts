import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPrivyClient } from "@/lib/auth/verifyRequest";
import { isServerSignerConfigured } from "@/lib/privy/wallet-service";
import { rateLimitByUser } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const idToken = req.headers.get("privy-id-token");

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing identity token" },
        { status: 401 },
      );
    }

    // Verify identity token and get user data (email comes from verified token)
    const privy = getPrivyClient();
    const privyUser = await privy.users().get({ id_token: idToken });

    // Rate limit: 10 sync requests per minute per user
    const rateLimited = await rateLimitByUser(privyUser.id, "user-sync", 10);
    if (rateLimited) return rateLimited;

    // Extract email from linked_accounts
    const emailAccount = privyUser.linked_accounts?.find(
      (account) => account.type === "email",
    ) as { type: "email"; address: string } | undefined;

    // Extract ALL Solana wallets from linked_accounts
    const solanaWallets = privyUser.linked_accounts?.filter((account) => {
      if (account.type !== "wallet") return false;
      const wallet = account as {
        chain_type?: string;
        chainType?: string;
        chain?: string;
      };
      return (
        wallet.chain_type === "solana" ||
        wallet.chainType === "solana" ||
        wallet.chain === "solana"
      );
    }) as Array<{ id: string; address: string }> | undefined;

    // Primary wallet (first Solana wallet) for backward compatibility
    const primaryWallet = solanaWallets?.[0];

    // Get existing user to preserve signer status and active wallet
    const existingUser = await prisma.user.findUnique({
      where: { id: privyUser.id },
      select: {
        walletSignerAdded: true,
        activeWalletId: true,
        wallets: true,
      },
    });

    // Upsert user with primary wallet info (backward compatibility)
    const user = await prisma.user.upsert({
      where: { id: privyUser.id },
      create: {
        id: privyUser.id,
        email: emailAccount?.address ?? null,
        walletId: primaryWallet?.id ?? null,
        walletAddress: primaryWallet?.address ?? null,
        walletSignerAdded: false,
      },
      update: {
        email: emailAccount?.address ?? null,
        walletId: primaryWallet?.id ?? null,
        walletAddress: primaryWallet?.address ?? null,
        // Preserve existing signer status - client updates this separately
        walletSignerAdded: existingUser?.walletSignerAdded ?? false,
      },
      // Only return safe fields - exclude tokens and secrets
      select: {
        id: true,
        email: true,
        walletAddress: true,
        walletSignerAdded: true,
        twitterUserId: true,
        twitterUsername: true,
        twitterConnectedAt: true,
        activeWalletId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Sync all Solana wallets to UserWallet table
    if (solanaWallets && solanaWallets.length > 0) {
      for (const wallet of solanaWallets) {
        // Check if wallet already exists
        const existingWallet = existingUser?.wallets.find(
          (w) => w.address === wallet.address,
        );

        if (!existingWallet) {
          // Create new wallet entry
          await prisma.userWallet.create({
            data: {
              userId: privyUser.id,
              privyWalletId: wallet.id,
              address: wallet.address,
              signerAdded: false,
              label: null,
              importedFrom: null,
            },
          });
        }
      }

      // If no active wallet is set, set the first wallet as active
      if (!existingUser?.activeWalletId) {
        const firstWallet = await prisma.userWallet.findFirst({
          where: { userId: privyUser.id },
          orderBy: { createdAt: "asc" },
        });

        if (firstWallet) {
          await prisma.user.update({
            where: { id: privyUser.id },
            data: { activeWalletId: firstWallet.id },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      user,
      signerConfigured: isServerSignerConfigured(),
    });
  } catch (error) {
    console.error("User sync error:", error);
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
  }
}
