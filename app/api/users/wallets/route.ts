import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { createServerOwnedWallet } from "@/lib/privy/wallet-service";

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
        serverOwned: true,
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
 * POST /api/users/wallets - Create a new server-owned wallet or set active wallet
 * Body: { action: "create" | "setActive", walletId?, label? }
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
    const { action, walletId, address, label } = body;

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
    } else if (action === "create") {
      // Create a new server-owned wallet via Privy
      try {
        const { walletId: privyWalletId, address: walletAddress } =
          await createServerOwnedWallet();

        const wallet = await prisma.userWallet.create({
          data: {
            userId,
            privyWalletId,
            address: walletAddress,
            serverOwned: true,
            label: label ?? null,
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
      } catch (error) {
        console.error(
          "[POST /api/users/wallets] Wallet creation failed:",
          error,
        );
        return NextResponse.json(
          { error: "Failed to create wallet" },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'create' or 'setActive'" },
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
