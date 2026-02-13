import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireAuth,
  isAuthResult,
  getPrivyClient,
} from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";

/**
 * GET /api/users/wallets - Get all wallets for the authenticated user
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireAuth(req);
    if (!isAuthResult(authResult)) return authResult;
    const { userId } = authResult;

    // Rate limit: 30 requests per minute per user
    const rateLimited = await rateLimitByUser(userId, "user-wallets-get", 30);
    if (rateLimited) return rateLimited;

    // Get all wallets for user
    const wallets = await prisma.userWallet.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        privyWalletId: true,
        address: true,
        signerAdded: true,
        label: true,
        importedFrom: true,
        createdAt: true,
      },
    });

    // Get active wallet ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeWalletId: true },
    });

    return NextResponse.json({
      wallets: wallets || [],
      activeWalletId: user?.activeWalletId || null,
    });
  } catch (error) {
    console.error("[GET /api/users/wallets] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallets" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/users/wallets - Add a new wallet or set active wallet
 * Body: { action: "add" | "setActive", walletId?, address?, label?, importedFrom? }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireAuth(req);
    if (!isAuthResult(authResult)) return authResult;
    const { userId } = authResult;

    // Rate limit: 20 requests per minute per user
    const rateLimited = await rateLimitByUser(userId, "user-wallets-post", 20);
    if (rateLimited) return rateLimited;

    const body = await req.json();
    const { action, walletId, address, label, importedFrom } = body;

    if (action === "setActive") {
      if (!walletId && !address) {
        return NextResponse.json(
          { error: "walletId or address is required for setActive" },
          { status: 400 },
        );
      }

      // Find the wallet
      const wallet = await prisma.userWallet.findFirst({
        where: {
          userId,
          OR: [
            walletId ? { id: walletId } : {},
            address ? { address } : {},
          ].filter((c) => Object.keys(c).length > 0),
        },
      });

      if (!wallet) {
        return NextResponse.json(
          { error: "Wallet not found" },
          { status: 404 },
        );
      }

      // Update user's active wallet
      await prisma.user.update({
        where: { id: userId },
        data: { activeWalletId: wallet.id },
      });

      return NextResponse.json({ success: true, activeWalletId: wallet.id });
    } else if (action === "add") {
      if (!address) {
        return NextResponse.json(
          { error: "address is required for add" },
          { status: 400 },
        );
      }

      // Check if wallet already exists
      const existing = await prisma.userWallet.findUnique({
        where: { userId_address: { userId, address } },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Wallet already exists", wallet: existing },
          { status: 409 },
        );
      }

      // Get Privy user to access linked accounts
      const privy = getPrivyClient();
      const idToken = req.headers.get("privy-id-token");

      if (!idToken) {
        return NextResponse.json(
          { error: "Missing identity token" },
          { status: 401 },
        );
      }

      const privyUser = await privy.users().get({ id_token: idToken });

      // Get Privy wallet ID from linked accounts
      const privyWallet = privyUser.linked_accounts?.find((account) => {
        if (account.type !== "wallet") return false;
        const w = account as { address?: string };
        return w.address === address;
      }) as { id: string; address: string } | undefined;

      if (!privyWallet) {
        return NextResponse.json(
          { error: "Wallet not found in Privy linked accounts" },
          { status: 404 },
        );
      }

      // Create new wallet
      const wallet = await prisma.userWallet.create({
        data: {
          userId,
          privyWalletId: privyWallet.id,
          address,
          label: label ?? null,
          importedFrom: importedFrom ?? null,
          signerAdded: false,
        },
      });

      // If this is the first wallet, set it as active
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeWalletId: true },
      });

      if (!user?.activeWalletId) {
        await prisma.user.update({
          where: { id: userId },
          data: { activeWalletId: wallet.id },
        });
      }

      return NextResponse.json({ success: true, wallet });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'add' or 'setActive'" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("[POST /api/users/wallets] Error:", error);
    return NextResponse.json(
      { error: "Failed to manage wallets" },
      { status: 500 },
    );
  }
}
