import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

// POST /api/staking/[agentId]/save-pool - Save staking pool after on-chain creation
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const rateLimited = await rateLimitByUser(
    auth.userId,
    "staking-save-pool",
    5,
  );
  if (rateLimited) return rateLimited;

  const { agentId } = await context.params;

  try {
    const body = await req.json();
    const { stakePoolAddress, tokenMint, rewardPoolNonce } = body;

    if (!stakePoolAddress || !tokenMint) {
      return NextResponse.json(
        { error: "Missing stakePoolAddress or tokenMint" },
        { status: 400 },
      );
    }

    // Verify agent exists and caller is creator
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { tokenMint: true, createdById: true },
    });

    if (!agent || agent.createdById !== auth.userId) {
      return NextResponse.json(
        { error: "Agent not found or unauthorized" },
        { status: 403 },
      );
    }

    // Upsert the pool record
    const pool = await prisma.stakingPool.upsert({
      where: { agentId },
      create: {
        agentId,
        tokenMint,
        stakePoolAddress,
        rewardPoolNonce: rewardPoolNonce ?? 0,
        rewardMint: tokenMint,
        createdById: auth.userId,
      },
      update: {
        stakePoolAddress,
        rewardPoolNonce: rewardPoolNonce ?? 0,
      },
    });

    return NextResponse.json({ pool });
  } catch (error) {
    console.error("[Staking] Error saving pool:", error);
    return NextResponse.json(
      { error: "Failed to save staking pool" },
      { status: 500 },
    );
  }
}
