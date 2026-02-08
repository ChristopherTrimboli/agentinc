import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import {
  resolveStakePoolAddress,
  buildStakeTransaction,
  findAvailableStakeNonce,
  getRewardPools,
  LOCK_DURATIONS,
} from "@/lib/staking/client";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

// POST /api/staking/[agentId]/stake - Build stake transaction for agent token
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  // Rate limit: 5 stake operations per minute
  const rateLimited = await rateLimitByUser(auth.userId, "staking-stake", 5);
  if (rateLimited) return rateLimited;

  const { agentId } = await context.params;

  try {
    const body = await req.json();
    const { tokenMint, amount, lockDays } = body;

    if (!tokenMint || !amount || !lockDays) {
      return NextResponse.json(
        { error: "Missing required fields: tokenMint, amount, lockDays" },
        { status: 400 },
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 },
      );
    }

    const validLockDays = [7, 30, 90, 180];
    if (!validLockDays.includes(lockDays)) {
      return NextResponse.json(
        { error: "Invalid lock duration. Choose 7, 30, 90, or 180 days" },
        { status: 400 },
      );
    }

    if (!auth.walletAddress) {
      return NextResponse.json(
        { error: "Wallet address not found. Please reconnect your wallet." },
        { status: 400 },
      );
    }

    // Verify agent exists and token matches
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { tokenMint: true, isMinted: true },
    });

    if (!agent || !agent.isMinted || agent.tokenMint !== tokenMint) {
      return NextResponse.json(
        { error: "Agent token not found or mismatch" },
        { status: 404 },
      );
    }

    // Find the staking pool
    const stakePoolAddress = await resolveStakePoolAddress(agentId, tokenMint);
    if (!stakePoolAddress) {
      return NextResponse.json(
        {
          error:
            "No staking pool exists for this agent token yet. The agent creator needs to create one first.",
        },
        { status: 404 },
      );
    }

    // Get reward pools for creating reward entries
    const rewardPools = await getRewardPools(stakePoolAddress);
    const rewardPoolsData = rewardPools.map((rp) => {
      const data = rp.account as unknown as { nonce?: number };
      return {
        nonce: data.nonce ?? 0,
        mint: tokenMint,
      };
    });

    // Find next available nonce
    const nonce = await findAvailableStakeNonce(
      auth.walletAddress,
      stakePoolAddress,
    );

    // Build the unsigned transaction
    const durationSeconds = LOCK_DURATIONS[lockDays];
    const transaction = await buildStakeTransaction({
      walletAddress: auth.walletAddress,
      stakePoolAddress,
      stakePoolMint: tokenMint,
      amount,
      durationSeconds,
      nonce,
      rewardPools: rewardPoolsData,
    });

    return NextResponse.json({
      transaction,
      stakePoolAddress,
      nonce,
    });
  } catch (error) {
    console.error("[Staking] Error building stake transaction:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create stake transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
