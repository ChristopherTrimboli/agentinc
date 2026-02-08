import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import {
  findStakePool,
  buildCreatePoolTransaction,
} from "@/lib/staking/client";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

// POST /api/staking/[agentId]/create-pool - Create a staking pool for an agent token
// Only the agent creator can do this
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  // Rate limit: 2 pool creations per minute
  const rateLimited = await rateLimitByUser(
    auth.userId,
    "staking-create-pool",
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

    // Verify agent exists, is minted, and caller is the creator
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        tokenMint: true,
        tokenSymbol: true,
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
        { error: "Only the agent creator can create a staking pool" },
        { status: 403 },
      );
    }

    // Check if pool already exists in DB
    const existingPool = await prisma.stakingPool.findUnique({
      where: { agentId },
    });
    if (existingPool) {
      return NextResponse.json(
        { error: "Staking pool already exists for this agent" },
        { status: 409 },
      );
    }

    // Check on-chain too
    const onChainPool = await findStakePool(agent.tokenMint);
    if (onChainPool) {
      // Pool exists on-chain but not tracked - save it
      await prisma.stakingPool.create({
        data: {
          agentId,
          tokenMint: agent.tokenMint,
          stakePoolAddress: onChainPool.publicKey.toBase58(),
          rewardPoolNonce: 0,
          rewardMint: agent.tokenMint,
          createdById: auth.userId,
        },
      });
      return NextResponse.json({
        stakePoolAddress: onChainPool.publicKey.toBase58(),
        message: "Pool already exists on-chain. Saved to database.",
        alreadyExists: true,
      });
    }

    // Build the create pool transaction
    const { transaction, stakePoolAddress } = await buildCreatePoolTransaction({
      walletAddress: auth.walletAddress,
      tokenMint: agent.tokenMint,
      nonce: 0,
    });

    return NextResponse.json({
      transaction,
      stakePoolAddress,
      tokenMint: agent.tokenMint,
    });
  } catch (error) {
    console.error("[Staking] Error creating pool:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create staking pool";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
