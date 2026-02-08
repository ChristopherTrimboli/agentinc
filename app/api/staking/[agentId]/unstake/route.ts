import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import {
  resolveStakePoolAddress,
  buildUnstakeTransaction,
  getRewardPools,
  getUserStakeEntries,
  bnToNumber,
} from "@/lib/staking/client";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

// POST /api/staking/[agentId]/unstake - Build unstake transaction for agent token
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  // Rate limit: 5 unstake operations per minute
  const rateLimited = await rateLimitByUser(auth.userId, "staking-unstake", 5);
  if (rateLimited) return rateLimited;

  const { agentId } = await context.params;

  try {
    const body = await req.json();
    const { tokenMint, positionId, stakeNonce } = body;

    if (!tokenMint || (stakeNonce === undefined && !positionId)) {
      return NextResponse.json(
        {
          error: "Missing required fields: tokenMint, stakeNonce or positionId",
        },
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
        { error: "No staking pool found for this agent token" },
        { status: 404 },
      );
    }

    // Verify the position is unlocked before building the transaction
    try {
      const entries = await getUserStakeEntries(
        auth.walletAddress,
        stakePoolAddress,
      );
      const targetEntry = entries.find((e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = e.account as any;
        return (d.nonce ?? 0) === (stakeNonce ?? 0);
      });
      if (targetEntry) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entryData = targetEntry.account as any;
        const createdTs = bnToNumber(entryData.createdTs);
        const duration = bnToNumber(entryData.duration);
        const unlockTime = (createdTs + duration) * 1000;
        if (Date.now() < unlockTime) {
          const hoursRemaining = Math.ceil(
            (unlockTime - Date.now()) / (1000 * 60 * 60),
          );
          return NextResponse.json(
            {
              error: `Position is still locked. Approximately ${hoursRemaining} hours remaining.`,
            },
            { status: 400 },
          );
        }
      }
    } catch {
      // Continue even if check fails — on-chain program will enforce lock
    }

    // Get reward pools for claiming rewards during unstake
    const rewardPools = await getRewardPools(stakePoolAddress);
    const rewardPoolsData = rewardPools.map((rp) => {
      const data = rp.account as unknown as { nonce?: number };
      return {
        nonce: data.nonce ?? 0,
        mint: tokenMint,
      };
    });

    // Build the unsigned unstake + claim transaction
    const transaction = await buildUnstakeTransaction({
      walletAddress: auth.walletAddress,
      stakePoolAddress,
      stakePoolMint: tokenMint,
      stakeNonce: stakeNonce ?? 0,
      rewardPools: rewardPoolsData,
    });

    return NextResponse.json({
      transaction,
      stakePoolAddress,
    });
  } catch (error) {
    console.error("[Staking] Error building unstake transaction:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create unstake transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
