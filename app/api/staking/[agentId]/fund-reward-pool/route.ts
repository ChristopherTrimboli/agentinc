import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import {
  resolveStakePoolAddress,
  getRewardPools,
  buildFundRewardPoolTransaction,
} from "@/lib/staking/client";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

// POST /api/staking/[agentId]/fund-reward-pool - Fund the reward pool with tokens
// The reward pool must be permissionless (anyone can fund) or caller must be creator
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const rateLimited = await rateLimitByUser(
    auth.userId,
    "staking-fund-reward-pool",
    5,
  );
  if (rateLimited) return rateLimited;

  const { agentId } = await context.params;

  try {
    if (!auth.walletAddress) {
      return NextResponse.json(
        { error: "Wallet address not found" },
        { status: 400 },
      );
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        tokenMint: true,
        isMinted: true,
      },
    });

    if (!agent || !agent.isMinted || !agent.tokenMint) {
      return NextResponse.json(
        { error: "Agent token not found" },
        { status: 404 },
      );
    }

    // Find the stake pool
    const stakePoolAddress = await resolveStakePoolAddress(
      agentId,
      agent.tokenMint,
    );
    if (!stakePoolAddress) {
      return NextResponse.json(
        { error: "No staking pool found" },
        { status: 404 },
      );
    }

    // Verify reward pool exists
    const rewardPools = await getRewardPools(stakePoolAddress);
    if (rewardPools.length === 0) {
      return NextResponse.json(
        { error: "No reward pool found. Create a reward pool first." },
        { status: 404 },
      );
    }

    // Parse body
    const body = await req.json();
    const amount = Number(body.amount);

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be greater than 0." },
        { status: 400 },
      );
    }

    // Build the fund transaction
    const transaction = await buildFundRewardPoolTransaction({
      walletAddress: auth.walletAddress,
      stakePoolAddress,
      tokenMint: agent.tokenMint,
      amount,
      rewardPoolNonce: 0,
    });

    return NextResponse.json({
      transaction,
      amount,
      stakePoolAddress,
    });
  } catch (error) {
    console.error("[Staking] Error funding reward pool:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fund reward pool";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
