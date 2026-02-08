import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import {
  resolveStakePoolAddress,
  getRewardPools,
  buildCreateRewardPoolTransaction,
} from "@/lib/staking/client";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

// POST /api/staking/[agentId]/create-reward-pool - Add a reward pool to an existing stake pool
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const rateLimited = await rateLimitByUser(
    auth.userId,
    "staking-create-reward-pool",
    2,
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

    // Verify agent exists and caller is the creator
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        tokenMint: true,
        isMinted: true,
        createdById: true,
      },
    });

    if (!agent || !agent.isMinted || !agent.tokenMint) {
      return NextResponse.json(
        { error: "Agent token not found" },
        { status: 404 },
      );
    }

    if (agent.createdById !== auth.userId) {
      return NextResponse.json(
        { error: "Only the agent creator can set up rewards" },
        { status: 403 },
      );
    }

    // Find the stake pool
    const stakePoolAddress = await resolveStakePoolAddress(
      agentId,
      agent.tokenMint,
    );
    if (!stakePoolAddress) {
      return NextResponse.json(
        { error: "No staking pool found. Create a staking pool first." },
        { status: 404 },
      );
    }

    // Check if reward pools already exist
    const existingRewardPools = await getRewardPools(stakePoolAddress);
    if (existingRewardPools.length > 0) {
      return NextResponse.json(
        { error: "Reward pool already exists for this stake pool" },
        { status: 409 },
      );
    }

    // Parse optional body params
    const body = await req.json().catch(() => ({}));
    const rewardRate = body.rewardRate ?? 0.001; // Default 0.1% per day

    // Build the create reward pool transaction
    const transaction = await buildCreateRewardPoolTransaction({
      walletAddress: auth.walletAddress,
      stakePoolAddress,
      tokenMint: agent.tokenMint,
      rewardRate,
      rewardPeriodSeconds: 86400, // Daily
      nonce: 0,
    });

    return NextResponse.json({
      transaction,
      stakePoolAddress,
      rewardRate,
    });
  } catch (error) {
    console.error("[Staking] Error creating reward pool:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create reward pool";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
