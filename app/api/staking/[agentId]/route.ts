import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth/verifyRequest";
import {
  findStakePool,
  getUserStakeEntries,
  getRewardPools,
  getTokenBalance,
  getTokenDecimals,
  getStakingClient,
  getStakingConnection,
  bnToNumber,
} from "@/lib/staking/client";
import { PublicKey } from "@solana/web3.js";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

// GET /api/staking/[agentId] - Get staking info for an agent's token
export async function GET(req: NextRequest, context: RouteContext) {
  const { agentId } = await context.params;
  const auth = await verifyAuth(req);

  try {
    // Verify agent exists and has a token
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

    const isCreator = auth?.userId ? agent.createdById === auth.userId : false;

    // Check if we have a tracked staking pool for this agent
    const trackedPool = await prisma.stakingPool.findUnique({
      where: { agentId },
    });

    // Try to find the staking pool on-chain
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let poolData: any = null;
    let stakePoolAddress: string | null = trackedPool?.stakePoolAddress ?? null;

    try {
      if (stakePoolAddress) {
        const client = getStakingClient();
        poolData = await client.getStakePool(stakePoolAddress);
      } else {
        const found = await findStakePool(agent.tokenMint);
        if (found) {
          poolData = found.account;
          stakePoolAddress = found.publicKey.toBase58();
        }
      }
    } catch {
      // Pool doesn't exist yet
    }

    // Default response when no pool exists
    if (!poolData || !stakePoolAddress) {
      return NextResponse.json({
        tokenMint: agent.tokenMint,
        tokenSymbol: agent.tokenSymbol,
        poolExists: false,
        hasRewardPool: false,
        stakePoolAddress: null,
        isCreator,
        tokenBalance: auth?.walletAddress
          ? await getTokenBalance(auth.walletAddress, agent.tokenMint)
          : 0,
        positions: [],
        stats: {
          totalStaked: 0,
          totalStakers: 0,
          apy: 0,
          rewardsPool: 0,
        },
      });
    }

    // Get token decimals
    const decimals = await getTokenDecimals(agent.tokenMint);

    // Fetch reward pools once (reused for entries, APY, and hasRewardPool check)
    let rewardPools: Awaited<ReturnType<typeof getRewardPools>> = [];
    try {
      rewardPools = await getRewardPools(stakePoolAddress);
    } catch {
      // Fine if no reward pools
    }
    const hasRewardPool = rewardPools.length > 0;

    // Pool exists - get real data
    let userTokenBalance = 0;
    const positions: Array<{
      id: string;
      nonce: number;
      amount: number;
      stakedAt: string;
      unlockAt: string;
      multiplier: number;
      earned: number;
    }> = [];

    if (auth?.walletAddress) {
      // Get user's token balance
      userTokenBalance = await getTokenBalance(
        auth.walletAddress,
        agent.tokenMint,
      );

      // Get user's stake entries
      try {
        const entries = await getUserStakeEntries(
          auth.walletAddress,
          stakePoolAddress,
        );

        for (const entry of entries) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = entry.account as any;

          const rawAmount = bnToNumber(data.amount);
          const createdTs = bnToNumber(data.createdTs);
          const duration = bnToNumber(data.duration);
          const nonce = data.nonce ?? 0;

          const uiAmount = rawAmount / 10 ** decimals;
          const stakedAt = new Date(createdTs * 1000);
          const unlockAt = new Date((createdTs + duration) * 1000);

          // Calculate earned rewards
          let earned = 0;
          if (hasRewardPool) {
            try {
              const client = getStakingClient();
              const rewardEntries = await client.searchRewardEntries({
                stakeEntry: entry.publicKey,
              });
              for (const re of rewardEntries) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const reData = re.account as any;
                earned += bnToNumber(reData.claimedAmount) / 10 ** decimals;
              }
            } catch {
              // Reward entry might not exist yet
            }
          }

          // Calculate weight multiplier
          const maxWeight = bnToNumber(poolData.maxWeight) || 1_000_000_000;
          const maxDur = bnToNumber(poolData.maxDuration) || 180 * 86400;
          const minDur = bnToNumber(poolData.minDuration) || 7 * 86400;

          const multiplier =
            maxDur > minDur
              ? 1 +
                ((duration - minDur) / (maxDur - minDur)) *
                  (maxWeight / 1_000_000_000 - 1)
              : 1;

          positions.push({
            id: entry.publicKey.toBase58(),
            nonce,
            amount: uiAmount,
            stakedAt: stakedAt.toISOString(),
            unlockAt: unlockAt.toISOString(),
            multiplier: Math.max(1, parseFloat(multiplier.toFixed(2))),
            earned,
          });
        }
      } catch (err) {
        console.error("[Staking] Error fetching user entries:", err);
      }
    }

    // Get pool-wide stats
    let totalStaked = 0;
    let totalStakers = 0;
    try {
      const client = getStakingClient();
      const allEntries = await client.searchStakeEntries({
        stakePool: new PublicKey(stakePoolAddress),
      });
      const uniqueStakers = new Set<string>();
      for (const e of allEntries) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = e.account as any;
        totalStaked += bnToNumber(data.amount);
        if (data.payer) uniqueStakers.add(data.payer.toBase58());
      }
      totalStakers = uniqueStakers.size;
      totalStaked = totalStaked / 10 ** decimals;
    } catch {
      // Fine if search fails
    }

    // Get reward pool info for APY estimation (using cached rewardPools)
    let apy = 0;
    let rewardsPoolAmount = 0;
    if (hasRewardPool) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rp = rewardPools[0].account as any;
        const rewardAmount = bnToNumber(rp.rewardAmount);
        const rewardPeriod = bnToNumber(rp.rewardPeriod) || 86400;

        // rewardAmount is a per-staked-token rate, scaled by REWARD_AMOUNT_PRECISION_FACTOR (1e9)
        // APY = compound rate: (1 + r)^n - 1, matching Streamflow's calculation
        const REWARD_PRECISION = 1_000_000_000;
        const ratePerPeriod = rewardAmount / REWARD_PRECISION;
        const periodsPerYear = (365 * 86400) / rewardPeriod;
        apy = (Math.pow(1 + ratePerPeriod, periodsPerYear) - 1) * 100;

        // Read the actual vault token balance as source of truth for rewards pool amount.
        // This is more reliable than fundedAmount - claimedAmount because BN deserialization
        // from the Streamflow SDK can silently produce incorrect values.
        const vaultAddress: PublicKey | undefined = rp.vault;
        if (vaultAddress) {
          try {
            const connection = getStakingConnection();
            const vaultBalance = await connection.getTokenAccountBalance(
              vaultAddress instanceof PublicKey
                ? vaultAddress
                : new PublicKey(vaultAddress),
            );
            rewardsPoolAmount = vaultBalance.value.uiAmount ?? 0;
          } catch (vaultErr) {
            console.warn(
              "[Staking] Failed to read vault balance, falling back to account data:",
              vaultErr,
            );
            // Fallback: use funded - claimed from account data
            const fundedAmount = bnToNumber(rp.fundedAmount);
            const claimedAmount = bnToNumber(rp.claimedAmount);
            rewardsPoolAmount =
              Math.max(0, fundedAmount - claimedAmount) / 10 ** decimals;
          }
        } else {
          // No vault field — fallback to funded - claimed
          const fundedAmount = bnToNumber(rp.fundedAmount);
          const claimedAmount = bnToNumber(rp.claimedAmount);
          rewardsPoolAmount =
            Math.max(0, fundedAmount - claimedAmount) / 10 ** decimals;
          console.warn(
            "[Staking] Reward pool missing vault field, keys:",
            Object.keys(rp),
          );
        }
      } catch (err) {
        console.error("[Staking] Error calculating reward pool stats:", err);
      }
    }

    return NextResponse.json({
      tokenMint: agent.tokenMint,
      tokenSymbol: agent.tokenSymbol,
      poolExists: true,
      hasRewardPool,
      stakePoolAddress,
      isCreator,
      rewardPoolNonce: trackedPool?.rewardPoolNonce ?? 0,
      tokenBalance: userTokenBalance,
      positions,
      stats: {
        totalStaked,
        totalStakers,
        apy: Math.min(apy, 9999),
        rewardsPool: rewardsPoolAmount,
      },
    });
  } catch (error) {
    console.error("[Staking] Error fetching staking data:", error);
    return NextResponse.json(
      { error: "Failed to fetch staking data" },
      { status: 500 },
    );
  }
}
