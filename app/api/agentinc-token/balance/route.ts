import { NextRequest, NextResponse } from "next/server";

import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import prisma from "@/lib/prisma";
import { rateLimitByUser } from "@/lib/rateLimit";
import { checkTokenHolding } from "@/lib/x402/token-holder-discount";
import { AGENTINC_TOKEN_MINT } from "@/lib/constants/mint";

/**
 * GET /api/agentinc-token/balance
 *
 * Returns the authenticated user's AGENTINC platform token balance.
 * Used by the chat UI to show the 20% holder discount badge.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(req);
  if (!isAuthResult(authResult)) return authResult as NextResponse;

  const rateLimited = await rateLimitByUser(
    authResult.userId,
    "agentinc-token-balance",
    30,
  );
  if (rateLimited) return rateLimited as NextResponse;

  try {
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
        tokenMint: AGENTINC_TOKEN_MINT,
      });
    }

    const holding = await checkTokenHolding(
      user.activeWallet.address,
      AGENTINC_TOKEN_MINT,
    );

    return NextResponse.json({
      holdsToken: holding.holdsToken,
      balance: holding.balance,
      decimals: holding.decimals,
      tokenMint: AGENTINC_TOKEN_MINT,
    });
  } catch (error) {
    console.error("[AgentIncToken] Error fetching balance:", error);
    return NextResponse.json({
      holdsToken: false,
      balance: 0,
      decimals: 0,
      tokenMint: AGENTINC_TOKEN_MINT,
    });
  }
}
