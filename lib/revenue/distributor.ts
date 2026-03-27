/**
 * Revenue Share Batch Distributor
 *
 * Drains the revenue event queue, calculates each holder's weighted share,
 * and pushes SOL from the treasury wallet to eligible $AGENTINC holders.
 *
 * Runs every 5 minutes via Vercel cron. Never called from the hot path.
 *
 * Concurrency safety: acquires a Redis distributed lock at the start.
 * If two cron invocations overlap, the second one exits immediately.
 */

import { Connection, PublicKey } from "@solana/web3.js";

import prisma from "@/lib/prisma";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import { TREASURY_ADDRESS, TREASURY_WALLET_ID } from "@/lib/x402/config";
import { sendSolFromWallet, withWalletLock } from "@/lib/privy/wallet-service";

import {
  REVENUE_SHARE_RATE,
  DUST_THRESHOLD_LAMPORTS,
  MAX_HOLDERS_PER_CYCLE,
  PAYOUT_BATCH_SIZE,
  type DistributionResult,
  type EligibleHolder,
} from "./constants";
import {
  acquireDistributionLock,
  drainRevenueEvents,
  getPendingPool,
  setPendingPool,
} from "./events";
import { getEligibleHolders } from "./holders";

// ── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Execute a single revenue distribution cycle.
 *
 * 1. Acquire exclusive distributed lock (prevents double-runs)
 * 2. Drain all pending revenue events from Redis (atomic RENAME)
 * 3. Calculate total profit and apply revenue share rate
 * 4. Add any rolled-over amount from previous cycles
 * 5. Fetch eligible holders and compute weighted shares
 * 6. Pre-check treasury balance
 * 7. Send SOL payouts in batches
 * 8. Persist distribution records to Postgres
 * 9. Release lock
 */
export async function distributeRevenue(): Promise<DistributionResult> {
  const result: DistributionResult = {
    success: false,
    totalProfitLamports: 0,
    distributedLamports: 0,
    holderCount: 0,
    payouts: [],
    rolledOverLamports: 0,
  };

  // ── Step 1: Acquire exclusive lock ──
  const releaseLock = await acquireDistributionLock();
  if (!releaseLock) {
    result.success = true;
    result.error = "Distribution already in progress (lock held)";
    console.log("[Revenue] Skipping — another distribution is in progress.");
    return result;
  }

  try {
    // ── Step 2: Drain events ──
    const events = await drainRevenueEvents();
    const pendingPool = await getPendingPool();

    if (events.length === 0 && pendingPool <= 0) {
      result.success = true;
      return result;
    }

    const totalProfit = events.reduce((sum, e) => sum + e.profitLamports, 0);
    result.totalProfitLamports = totalProfit;

    // ── Step 3: Calculate distributable amount ──
    const revenueShareFromEvents = Math.floor(totalProfit * REVENUE_SHARE_RATE);
    const distributable = revenueShareFromEvents + pendingPool;

    if (distributable <= 0) {
      result.success = true;
      return result;
    }

    // ── Step 4: Get eligible holders ──
    const holders = await getEligibleHolders();
    result.holderCount = holders.length;

    if (holders.length === 0) {
      await setPendingPool(distributable);
      result.rolledOverLamports = distributable;
      result.success = true;
      console.log(
        `[Revenue] No eligible holders. Rolled over ${distributable} lamports.`,
      );
      return result;
    }

    if (holders.length > MAX_HOLDERS_PER_CYCLE) {
      console.warn(
        `[Revenue] ${holders.length} eligible holders exceeds cap of ${MAX_HOLDERS_PER_CYCLE}. ` +
          `Consider migrating to claim-based distribution.`,
      );
    }

    const processableHolders = holders.slice(0, MAX_HOLDERS_PER_CYCLE);

    // ── Step 5: Calculate weighted shares ──
    const totalWeight = processableHolders.reduce(
      (sum, h) => sum + h.multiplier,
      0,
    );

    const payoutPlan = processableHolders.map((holder) => ({
      holder,
      amountLamports: Math.floor(
        (distributable * holder.multiplier) / totalWeight,
      ),
    }));

    const viablePayouts = payoutPlan.filter(
      (p) => p.amountLamports >= DUST_THRESHOLD_LAMPORTS,
    );

    if (viablePayouts.length === 0) {
      await setPendingPool(distributable);
      result.rolledOverLamports = distributable;
      result.success = true;
      console.log(
        `[Revenue] All payouts below dust threshold. Rolled over ${distributable} lamports.`,
      );
      return result;
    }

    const totalToDistribute = viablePayouts.reduce(
      (sum, p) => sum + p.amountLamports,
      0,
    );
    const remainder = distributable - totalToDistribute;

    // ── Step 6: Validate treasury config + balance ──
    if (!TREASURY_ADDRESS || !TREASURY_WALLET_ID) {
      result.error = "Treasury wallet not configured";
      console.error(
        "[Revenue] Treasury wallet not configured, skipping distribution",
      );
      await setPendingPool(distributable);
      result.rolledOverLamports = distributable;
      return result;
    }

    const treasuryBalance = await getTreasuryBalance();
    if (treasuryBalance < BigInt(totalToDistribute)) {
      result.error = `Insufficient treasury balance: have ${treasuryBalance} lamports, need ${totalToDistribute}`;
      console.error(`[Revenue] ${result.error}`);
      await setPendingPool(distributable);
      result.rolledOverLamports = distributable;
      return result;
    }

    // ── Step 7: Create distribution record ──
    const distribution = await prisma.revenueDistribution.create({
      data: {
        totalProfitLamports: BigInt(totalProfit),
        distributedLamports: BigInt(totalToDistribute),
        holderCount: viablePayouts.length,
        perHolderLamports: BigInt(
          Math.floor(totalToDistribute / viablePayouts.length),
        ),
        status: "processing",
      },
    });

    // Persist revenue events — mark as NOT distributed yet (updated after payouts)
    if (events.length > 0) {
      await prisma.revenueEvent.createMany({
        data: events.map((e) => ({
          timestamp: new Date(e.timestamp),
          type: e.type,
          grossLamports: BigInt(e.grossLamports),
          costLamports: BigInt(e.costLamports),
          profitLamports: BigInt(e.profitLamports),
          revenueShareLamports: BigInt(
            Math.floor(e.profitLamports * REVENUE_SHARE_RATE),
          ),
          txSignature: e.txSignature,
          userId: e.userId,
          distributed: false,
          distributionId: distribution.id,
        })),
      });
    }

    // ── Step 8: Execute payouts in batches ──
    let distributedTotal = 0;

    for (let i = 0; i < viablePayouts.length; i += PAYOUT_BATCH_SIZE) {
      const batch = viablePayouts.slice(i, i + PAYOUT_BATCH_SIZE);
      const batchResults = await processBatch(batch, distribution.id);

      for (const br of batchResults) {
        result.payouts.push(br);
        if (br.status === "sent") {
          distributedTotal += br.amountLamports;
        }
      }
    }

    result.distributedLamports = distributedTotal;

    // Roll over anything that failed + the sub-dust remainder
    const failedAmount = totalToDistribute - distributedTotal;
    const rollover = remainder + failedAmount;
    await setPendingPool(rollover);
    result.rolledOverLamports = rollover;

    // ── Step 9: Finalize records ──
    const finalStatus =
      distributedTotal === totalToDistribute ? "completed" : "partial";
    await prisma.revenueDistribution.update({
      where: { id: distribution.id },
      data: {
        status: finalStatus,
        distributedLamports: BigInt(distributedTotal),
      },
    });

    // Mark events as distributed now that payouts have been attempted
    if (events.length > 0) {
      await prisma.revenueEvent.updateMany({
        where: { distributionId: distribution.id },
        data: { distributed: true },
      });
    }

    result.success = true;
    console.log(
      `[Revenue] Distribution ${finalStatus}: ${distributedTotal} lamports to ${viablePayouts.length} holders, ` +
        `${rollover} lamports rolled over.`,
    );

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.error = errorMsg;
    console.error("[Revenue] Distribution failed:", error);
    return result;
  } finally {
    await releaseLock();
  }
}

// ── Treasury Balance Check ───────────────────────────────────────────────────

async function getTreasuryBalance(): Promise<bigint> {
  try {
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const balance = await connection.getBalance(
      new PublicKey(TREASURY_ADDRESS),
    );
    return BigInt(balance);
  } catch (error) {
    console.error("[Revenue] Failed to check treasury balance:", error);
    return 0n;
  }
}

// ── Batch Processing ─────────────────────────────────────────────────────────

interface PayoutPlanItem {
  holder: EligibleHolder;
  amountLamports: number;
}

interface PayoutResult {
  wallet: string;
  amountLamports: number;
  tier: string;
  txSignature?: string;
  status: "sent" | "failed";
}

/**
 * Process a batch of payouts sequentially, using the treasury wallet lock.
 * Each payout is recorded in the database regardless of success/failure.
 */
async function processBatch(
  batch: PayoutPlanItem[],
  distributionId: string,
): Promise<PayoutResult[]> {
  const results: PayoutResult[] = [];

  for (const item of batch) {
    const payoutRecord = await prisma.revenueSharePayout.create({
      data: {
        distributionId,
        walletAddress: item.holder.wallet,
        amountLamports: BigInt(item.amountLamports),
        tier: item.holder.tier,
        status: "pending",
      },
    });

    try {
      const sendResult = await withWalletLock(TREASURY_ADDRESS, () =>
        sendSolFromWallet(
          TREASURY_WALLET_ID,
          TREASURY_ADDRESS,
          item.holder.wallet,
          BigInt(item.amountLamports),
        ),
      );

      if (sendResult.success) {
        await prisma.revenueSharePayout.update({
          where: { id: payoutRecord.id },
          data: {
            status: "confirmed",
            txSignature: sendResult.signature,
            confirmedAt: new Date(),
          },
        });

        results.push({
          wallet: item.holder.wallet,
          amountLamports: item.amountLamports,
          tier: item.holder.tier,
          txSignature: sendResult.signature,
          status: "sent",
        });
      } else {
        await prisma.revenueSharePayout.update({
          where: { id: payoutRecord.id },
          data: { status: "failed" },
        });

        results.push({
          wallet: item.holder.wallet,
          amountLamports: item.amountLamports,
          tier: item.holder.tier,
          status: "failed",
        });

        console.error(
          `[Revenue] Payout failed for ${item.holder.wallet}: ${sendResult.error}`,
        );
      }
    } catch (error) {
      await prisma.revenueSharePayout.update({
        where: { id: payoutRecord.id },
        data: { status: "failed" },
      });

      results.push({
        wallet: item.holder.wallet,
        amountLamports: item.amountLamports,
        tier: item.holder.tier,
        status: "failed",
      });

      console.error(`[Revenue] Payout error for ${item.holder.wallet}:`, error);
    }
  }

  return results;
}
