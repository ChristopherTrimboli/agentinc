import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import {
  resolveStakePoolAddress,
  buildClaimRewardsTransaction,
  getRewardPools,
  getUserStakeEntries,
  bnToNumber,
} from "@/lib/staking/client";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

// POST /api/staking/[agentId]/claim - Claim rewards without unstaking
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  // Rate limit: 5 claim operations per minute
  const rateLimited = await rateLimitByUser(auth.userId, "staking-claim", 5);
  if (rateLimited) return rateLimited;

  const { agentId } = await context.params;

  try {
    const body = await req.json();
    const { tokenMint, stakeNonce } = body;

    if (!tokenMint || stakeNonce === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: tokenMint, stakeNonce" },
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

    // Verify the user has a stake entry with this nonce
    try {
      const entries = await getUserStakeEntries(
        auth.walletAddress,
        stakePoolAddress,
      );
      const targetEntry = entries.find((e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = e.account as any;
        return (d.nonce ?? 0) === stakeNonce;
      });
      if (!targetEntry) {
        return NextResponse.json(
          { error: "Stake position not found" },
          { status: 404 },
        );
      }

      // Check if the entry has been closed (unstaked already)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entryData = targetEntry.account as any;
      const closedTs = bnToNumber(entryData.closedTs);
      if (closedTs > 0) {
        return NextResponse.json(
          { error: "This position has already been unstaked" },
          { status: 400 },
        );
      }
    } catch {
      // Continue — on-chain program will enforce validity
    }

    // Get reward pools for claiming
    const rewardPools = await getRewardPools(stakePoolAddress);
    if (rewardPools.length === 0) {
      return NextResponse.json(
        { error: "No reward pools exist. There are no rewards to claim." },
        { status: 404 },
      );
    }

    const rewardPoolsData = rewardPools.map((rp) => {
      const data = rp.account as unknown as { nonce?: number };
      return {
        nonce: data.nonce ?? 0,
        mint: tokenMint,
      };
    });

    // Build the unsigned claim transaction
    const transaction = await buildClaimRewardsTransaction({
      walletAddress: auth.walletAddress,
      stakePoolAddress,
      stakePoolMint: tokenMint,
      stakeNonce,
      rewardPools: rewardPoolsData,
    });

    return NextResponse.json({
      transaction,
      stakePoolAddress,
    });
  } catch (error) {
    console.error("[Staking] Error building claim transaction:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create claim transaction";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
