import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPrivyClient } from "@/lib/auth/verifyRequest";
import { isServerSignerConfigured } from "@/lib/privy/wallet-service";

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

    // Extract email from linked_accounts
    const emailAccount = privyUser.linked_accounts?.find(
      (account) => account.type === "email",
    ) as { type: "email"; address: string } | undefined;

    // Extract Solana wallet from linked_accounts
    const solanaWallet = privyUser.linked_accounts?.find((account) => {
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
    }) as { id: string; address: string } | undefined;

    // Get existing user to preserve walletSignerAdded status
    const existingUser = await prisma.user.findUnique({
      where: { id: privyUser.id },
      select: { walletSignerAdded: true },
    });

    // Upsert user with wallet info
    // Note: walletSignerAdded is set via the /api/users/signer-status endpoint after client adds signer
    const user = await prisma.user.upsert({
      where: { id: privyUser.id },
      create: {
        id: privyUser.id,
        email: emailAccount?.address ?? null,
        walletId: solanaWallet?.id ?? null,
        walletAddress: solanaWallet?.address ?? null,
        walletSignerAdded: false,
      },
      update: {
        email: emailAccount?.address ?? null,
        walletId: solanaWallet?.id ?? null,
        walletAddress: solanaWallet?.address ?? null,
        // Preserve existing signer status - client updates this separately
        walletSignerAdded: existingUser?.walletSignerAdded ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      user,
      signerConfigured: isServerSignerConfigured(),
    });
  } catch (error) {
    console.error("User sync error:", error);
    return NextResponse.json({ error: "Failed to sync user" }, { status: 401 });
  }
}
