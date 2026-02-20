import { NextRequest, NextResponse } from "next/server";

import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import prisma from "@/lib/prisma";
import { rateLimitByUser } from "@/lib/rateLimit";
import { checkTokenHolding } from "@/lib/x402/token-holder-discount";

/**
 * GET /api/agents/[agentId]/token-balance
 *
 * Returns the authenticated user's SPL token balance for the agent's token.
 * Used by the chat UI to show the token balance pill and enable the
 * "Pay with token (20% off)" toggle.
 *
 * Supports both DB ID and tokenMint in the agentId param.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authResult = await requireAuth(req);
  if (!isAuthResult(authResult)) return authResult as NextResponse;

  const rateLimited = await rateLimitByUser(
    authResult.userId,
    "token-balance",
    30,
  );
  if (rateLimited) return rateLimited as NextResponse;

  try {
    const { id } = await params;

    const agent = await prisma.agent.findFirst({
      where: { OR: [{ id }, { tokenMint: id }] },
      select: { tokenMint: true, tokenSymbol: true },
      cacheStrategy: { ttl: 60, swr: 120 },
    });

    if (!agent?.tokenMint) {
      return NextResponse.json({
        holdsToken: false,
        balance: 0,
        decimals: 0,
        tokenMint: null,
        tokenSymbol: null,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      select: { activeWallet: { select: { address: true } } },
      cacheStrategy: { ttl: 5 },
    });

    if (!user?.activeWallet?.address) {
      return NextResponse.json({
        holdsToken: false,
        balance: 0,
        decimals: 0,
        tokenMint: agent.tokenMint,
        tokenSymbol: agent.tokenSymbol,
      });
    }

    const holding = await checkTokenHolding(
      user.activeWallet.address,
      agent.tokenMint,
    );

    return NextResponse.json({
      holdsToken: holding.holdsToken,
      balance: holding.balance,
      decimals: holding.decimals,
      tokenMint: agent.tokenMint,
      tokenSymbol: agent.tokenSymbol,
    });
  } catch (error) {
    console.error("[TokenBalance] Error fetching balance:", error);
    return NextResponse.json({
      holdsToken: false,
      balance: 0,
      decimals: 0,
      tokenMint: null,
      tokenSymbol: null,
    });
  }
}
